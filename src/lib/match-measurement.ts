// ============================================================================
// matchMeasurement — score how well a live BLE reading fits a placed part
// ============================================================================
// Used by the Build-Assist flow inside CircuitBuilder. The user touches a
// real component to the tester; we get a `BleReadPayload` and rank the
// circuit's still-unfound components by:
//   1. type match (resistor → R, capacitor → C, etc.)  hard filter
//   2. % difference between measured value and the part's nominal value
// Returns the best candidate or null if nothing on the schematic matches.
// ============================================================================

import type { BleReadPayload, ParsedPinOrder } from "@/hooks/use-ble-feed";
import type { PlacedComponent } from "@/hooks/use-circuit-store";

/**
 * Maps the firmware's `detected` string (ComponentKey) to the single-letter
 * type code used on PlacedComponent.type in the schematic store.
 *
 * New entries vs v1:
 *   jfet      → "J"    (J-FET; primary key: vgs)
 *   thyristor → "SCR"  (SCR;   primary key: vgt)
 *   triac     → "TRI"  (Triac; primary key: vgt)
 *
 * Note: the firmware resolves the thyristor/triac ambiguity in use-ble-feed
 * before the payload reaches here, so we receive "thyristor" or "triac" —
 * never the raw "thyristor" + values.type="Triac" pair.
 */
const FAMILY_TO_TYPE: Record<string, string> = {
  resistor:  "R",
  capacitor: "C",
  inductor:  "L",
  diode:     "D",
  bjt:       "Q",
  mosfet:    "M",
  jfet:      "J",   // ← new
  thyristor: "SCR", // ← new
  triac:     "TRI", // ← new
};

/**
 * The firmware `values` key whose SI-parsed number is compared against the
 * schematic component's nominal value to compute error %.
 *
 * thyristor / triac both carry "vgt" (gate trigger voltage in mV from fw).
 * jfet carries "vgs" (pinch-off / gate threshold voltage).
 */
const PRIMARY_KEY: Record<string, string> = {
  R:   "r",
  C:   "c",
  L:   "l",
  D:   "vf",
  Q:   "hfe",
  M:   "vth",
  J:   "vgs",  // ← new
  SCR: "vgt",  // ← new
  TRI: "vgt",  // ← new
};

/** Parse a value like "10kΩ", "100nF", "47.20" into a base SI number. */
export function parseValue(raw: string): number | null {
  if (!raw) return null;
  const m = raw.replace(/[Ω∙\s]/g, "").match(/^([+-]?[\d.]+)([pnuµmkMG]?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult: Record<string, number> = {
    "": 1, p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9,
  };
  return n * (mult[m[2]] ?? 1);
}

export interface MatchResult {
  comp:     PlacedComponent;
  measured: number;
  nominal:  number;
  errorPct: number;
  /**
   * Structured pin-order forwarded from the BLE payload.
   * Present for BJT, MOSFET, JFET, diode, thyristor, triac; null for R/C/L.
   * Lets the panel display probe-to-pin wiring without re-accessing the hook.
   */
  pinOrder: ParsedPinOrder | null;
}

export function findBestMatch(
  ble: BleReadPayload,
  comps: PlacedComponent[],
): MatchResult | null {
  // Both fields are nullable in the updated BleReadPayload —
  // null means either disconnected or firmware reported COMP_NONE / COMP_ERROR.
  if (!ble.detected || !ble.values) return null;

  const wantType = FAMILY_TO_TYPE[ble.detected];
  if (!wantType) return null;

  const key         = PRIMARY_KEY[wantType];
  const measuredRaw = key ? ble.values[key] : undefined;
  const measured    = measuredRaw ? parseValue(measuredRaw) : null;
  if (measured == null) return null;

  let best: MatchResult | null = null;
  for (const c of comps) {
    if (c.type !== wantType || c.found) continue;
    const nominal = parseValue(c.value);
    if (nominal == null || nominal === 0) continue;
    const errorPct = Math.abs((measured - nominal) / nominal) * 100;
    if (!best || errorPct < best.errorPct) {
      best = { comp: c, measured, nominal, errorPct, pinOrder: ble.pinOrder };
    }
  }
  return best;
}

export function formatSI(v: number, unit: string): string {
  const abs = Math.abs(v);
  const tiers: [number, string][] = [
    [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"],
    [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"],
  ];
  for (const [m, p] of tiers) {
    if (abs >= m) return `${(v / m).toFixed(2)}${p}${unit}`;
  }
  return `${v}${unit}`;
}