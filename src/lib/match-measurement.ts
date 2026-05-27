// ============================================================================
// matchMeasurement — score how well a live BLE reading fits a placed part
// ============================================================================
// Maps firmware detected strings → schematic type codes, parses SI-prefixed
// values from firmware, and ranks unmatched circuit components by closeness.
//
// Firmware value formats (from components.ts spec):
//   R   → values.r   e.g. "10.0k"  (kΩ, SI prefix, trailing O stripped)
//   C   → values.c   e.g. "47.2u"  (µF, SI prefix, trailing F stripped)
//   L   → values.l   e.g. "10.0u"  (µH, SI prefix)
//   D   → values.vf  e.g. "612"    (mV plain integer — divide by 1000 for V)
//   Q   → values.hfe e.g. "182"    (dimensionless integer)
//   M   → values.vth e.g. "2100"   (mV plain integer)
//   J   → values.vgs e.g. "-1420"  (mV signed integer)
//   SCR → values.vgt e.g. "800"    (mV plain integer, optional)
//   TRI → values.vgt e.g. "600"    (mV plain integer, optional)
// ============================================================================

import type { BleReadPayload, ParsedPinOrder } from "@/hooks/use-ble-feed";
import type { PlacedComponent } from "@/hooks/use-circuit-store";

// ── Type mapping ──────────────────────────────────────────────────────────────
// firmware detected string  →  schematic PlacedComponent.type code

const FAMILY_TO_TYPE: Record<string, string> = {
  resistor:  "R",
  capacitor: "C",
  inductor:  "L",
  diode:     "D",
  bjt:       "Q",
  mosfet:    "M",
  jfet:      "J",
  thyristor: "SCR",
  triac:     "TRI",
};

// ── Primary firmware value key per schematic type ─────────────────────────────
// Key must match exactly what the firmware puts inside values{}

const PRIMARY_KEY: Record<string, string> = {
  R:   "r",
  C:   "c",
  L:   "l",
  D:   "vf",
  Q:   "hfe",
  M:   "vth",
  J:   "vgs",
  SCR: "vgt",
  TRI: "vgt",
};

// ── Unit of the PRIMARY_KEY value as it arrives from firmware ─────────────────
// "si"  = SI-prefixed string, parse with parseSI()  (R, C, L)
// "mv"  = plain millivolt integer, divide by 1000   (D, M, J, SCR, TRI)
// "raw" = dimensionless integer, use as-is           (Q)

type FwFormat = "si" | "mv" | "raw";

const FW_FORMAT: Record<string, FwFormat> = {
  R:   "si",
  C:   "si",
  L:   "si",
  D:   "mv",
  Q:   "raw",
  M:   "mv",
  J:   "mv",
  SCR: "mv",
  TRI: "mv",
};

// ── SI prefix parser ──────────────────────────────────────────────────────────

const SI_MULT: Record<string, number> = {
  p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3,
  "": 1, k: 1e3, M: 1e6, G: 1e9,
};

/**
 * Parse a firmware value string into a base-unit SI number.
 *
 * Handles:
 *   "10.0k"  → 10000       (resistor, kΩ)
 *   "47.2u"  → 47.2e-6     (capacitor, µF)
 *   "-1420"  → -1420       (raw, later /1000 for mV types)
 *   "10.0kO" → 10000       (trailing 'O' = Ohms, stripped)
 *   "47.2uF" → 47.2e-6     (trailing 'F' = Farads, stripped)
 */
export function parseValue(raw: string): number | null {
  if (!raw) return null;
  // Strip trailing unit chars (O = Ohms firmware ASCII-safe, F = Farads, A = Amps)
  const cleaned = raw.replace(/[OFAΩHz]+$/, "").trim();
  const m = cleaned.match(/^([+-]?[\d.]+)([pnuµmkMG]?)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult = SI_MULT[m[2]] ?? 1;
  if (isNaN(n)) return null;
  return n * mult;
}

/**
 * Parse a firmware value according to the type's known format and return the
 * value in the same unit the schematic component's `value` field uses so the
 * two numbers are directly comparable.
 *
 * Schematic defaultValues are written in "human" units:
 *   R:   "10kΩ"   → base Ohms
 *   C:   "100nF"  → base Farads
 *   L:   "10µH"   → base Henrys
 *   D:   "600mV"  → base Volts
 *   Q:   "100"    → dimensionless
 *   M:   "2100mV" → base Volts  (schematic value in mV → parse as mV)
 *   J:   "-1420mV"→ base Volts
 *   SCR: "800mV"  → base Volts
 *   TRI: "600mV"  → base Volts
 */
function firmwareToBase(raw: string, fmt: FwFormat): number | null {
  const v = parseValue(raw);
  if (v === null) return null;
  switch (fmt) {
    case "si":  return v;           // already in base units (Ω, F, H)
    case "mv":  return v / 1000;    // firmware sends mV → convert to V
    case "raw": return v;           // dimensionless
  }
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface MatchResult {
  comp:     PlacedComponent;
  /** Measured value in the same unit as nominal (base SI or dimensionless) */
  measured: number;
  nominal:  number;
  errorPct: number;
  pinOrder: ParsedPinOrder | null;
}

// ── Main matching function ────────────────────────────────────────────────────

export function findBestMatch(
  ble: BleReadPayload,
  comps: PlacedComponent[],
): MatchResult | null {
  if (!ble.detected || !ble.values) return null;

  const schType = FAMILY_TO_TYPE[ble.detected];
  if (!schType) return null;

  const fwKey  = PRIMARY_KEY[schType];
  const fmt    = FW_FORMAT[schType];
  if (!fwKey || !fmt) return null;

  const fwRaw  = ble.values[fwKey];
  if (!fwRaw) return null;

  const measured = firmwareToBase(fwRaw, fmt);
  if (measured === null) return null;

  let best: MatchResult | null = null;

  for (const c of comps) {
    if (c.type !== schType || c.found) continue;

    // Parse schematic component value — stored in human-readable form e.g. "10kΩ"
    const nominal = parseValue(c.value);
    if (nominal === null || nominal === 0) continue;

    // For mV types the schematic stores e.g. "600mV" → parseValue gives 0.6 V ✓
    // For si types the schematic stores e.g. "10kΩ"  → parseValue gives 10000 ✓
    // For raw (hFE) the schematic stores e.g. "100"  → parseValue gives 100 ✓
    const errorPct = Math.abs((measured - nominal) / nominal) * 100;

    if (!best || errorPct < best.errorPct) {
      best = { comp: c, measured, nominal, errorPct, pinOrder: ble.pinOrder ?? null };
    }
  }

  return best;
}

// ── SI formatter ──────────────────────────────────────────────────────────────

export function formatSI(v: number, unit: string): string {
  const abs = Math.abs(v);
  const tiers: [number, string][] = [
    [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""],
    [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"],
  ];
  for (const [m, p] of tiers) {
    if (abs >= m) return `${(v / m).toFixed(2)}${p}${unit}`;
  }
  return `${v.toFixed(3)}${unit}`;
}
