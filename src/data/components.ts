// ============================================================================
// COMPONENT SPEC TABLE — what the hardware actually transmits over BLE
// ============================================================================
// Parameters here MUST match exactly the JSON keys the firmware sends.
// Do not add parameters the hardware does not emit; mock values are only
// shown when disconnected and are clearly labelled.
//
// SI prefix note
// --------------
// The firmware embeds the SI prefix directly in the value string:
//   "10.0k"  → 10.0 kΩ       "650"    → 650 mV (plain, no prefix)
//   "47.2u"  → 47.2 µF       "1.85n"  → 1.85 nF
// The dashboard calls `parseSIValue()` to split the number from the prefix
// so it can display both the numeric value and the correct unit symbol.
// ============================================================================

// ---- TYPES ----------------------------------------------------------------

/** Stable string keys for every supported component family + "auto" detect. */
export type ComponentKey =
  | "auto"
  | "bjt"
  | "mosfet"
  | "jfet"
  | "diode"
  | "thyristor"   // SCR
  | "triac"       // bidirectional thyristor (same firmware key, normalised in use-ble-feed.ts)
  | "resistor"
  | "capacitor"
  | "inductor"    // not yet emitted by firmware; reserved for future
  | "frequency"
  | "voltage";

/** A single measurable parameter shown as one card in the Dashboard grid. */
export interface Parameter {
  key: string;           // must match the JSON key from firmware, e.g. "hfe"
  label: string;         // short display label, e.g. "hFE"
  value: string;         // mock value shown when disconnected
  /** Base unit WITHOUT prefix, e.g. "Ω", "F", "V", "A". Empty if dimensionless. */
  unit: string;
  range: string;         // hardware capability, e.g. "0 – 50 V"
  description?: string;  // tooltip / caption
}

/** Pin layout for 2- or 3-terminal devices. */
export interface PinLayout {
  /** Canonical pin names in order, e.g. ["B","C","E"] or ["A","K"].
   *  The firmware sends a pinOrder string like "123=BCE" which maps
   *  physical probe numbers to these designators. */
  pins: string[];
  note?: string;
}

/** Hardware detection flags — boolean things the tester can recognise. */
export interface DetectionFlag {
  label: string;
  active: boolean; // mock default; replaced by live data where firmware signals it
}

/** Full component definition. */
export interface ComponentSpec {
  key: ComponentKey;
  type: string;
  slug: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glow: string;
  /** Headline parameter key — must match one entry in `parameters`. */
  primaryKey: string;
  primaryLabel: string;
  parameters: Parameter[];
  pinLayout?: PinLayout;
  flags?: DetectionFlag[];
}

// ---- SI PREFIX PARSING ----------------------------------------------------

/**
 * SI prefix map used by the firmware.
 * 'O' is the firmware's safe-ASCII substitute for Ω; normalised by the dashboard.
 */
export const SI_PREFIX_MAP: Record<string, number> = {
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  "": 1,
  k: 1e3,
  M: 1e6,
  G: 1e9,
};

export interface ParsedSIValue {
  /** Raw numeric part, e.g. 10.0 */
  number: number;
  /** SI prefix character, e.g. "k". Empty string if none. */
  prefix: string;
  /** Multiplier for this prefix, e.g. 1000 */
  multiplier: number;
  /** Value in base SI units (number × multiplier) */
  baseValue: number;
  /** Original string after cleaning (for fallback display) */
  raw: string;
}

/**
 * Parse a firmware value string that may contain an SI prefix.
 * Examples:  "10.0k" → { number:10.0, prefix:"k", multiplier:1000, baseValue:10000 }
 *            "650"   → { number:650,   prefix:"",  multiplier:1,    baseValue:650   }
 *            "1.85n" → { number:1.85,  prefix:"n", multiplier:1e-9, baseValue:1.85e-9 }
 *
 * The function also strips the firmware unit characters appended after the prefix:
 *   trailing 'O' (Ohms), 'F' (Farads), 'A' (Amps) — these are not needed once
 *   we know the parameter key and can look up the unit from the spec table.
 */
export function parseSIValue(raw: string): ParsedSIValue | null {
  if (!raw || raw === "—") return null;

  // Normalise: 'O' → Ω (for display), strip trailing unit chars F, A, Ω
  const cleaned = raw
    .replace(/([0-9kmunpMG])O$/, "$1")  // trailing 'O' (Ohms) after digit or prefix
    .replace(/([0-9kmunpMG])[FAΩ]$/, "$1") // trailing F (Farads) or A (Amps)
    .trim();

  // Match optional sign, digits, optional decimal, optional SI prefix
  const match = cleaned.match(/^([+-]?\d+(?:\.\d+)?)([pnumkMG]?)$/);
  if (!match) return null;

  const number = parseFloat(match[1]);
  const prefix = match[2] ?? "";
  const multiplier = SI_PREFIX_MAP[prefix] ?? 1;

  return {
    number,
    prefix,
    multiplier,
    baseValue: number * multiplier,
    raw: cleaned,
  };
}

/**
 * Format a parsed SI value for display, choosing the best prefix.
 * Pass in the canonical base unit (e.g. "Ω", "F", "V").
 * Returns { display: "10.0", unit: "kΩ" }
 */
export function formatSIValue(
  baseValue: number,
  baseUnit: string,
): { display: string; unit: string } {
  const prefixes: [string, number][] = [
    ["G", 1e9], ["M", 1e6], ["k", 1e3], ["", 1],
    ["m", 1e-3], ["µ", 1e-6], ["n", 1e-9], ["p", 1e-12],
  ];

  const abs = Math.abs(baseValue);
  let chosen: [string, number] = ["", 1];

  for (const [pfx, mult] of prefixes) {
    if (abs >= mult) { chosen = [pfx, mult]; break; }
  }

  const scaled = baseValue / chosen[1];
  let display: string;
  if (Math.abs(scaled) >= 100) display = scaled.toFixed(1);
  else if (Math.abs(scaled) >= 10) display = scaled.toFixed(2);
  else display = scaled.toFixed(3);

  return { display, unit: chosen[0] + baseUnit };
}


// ---- THE SPEC TABLE -------------------------------------------------------
// Only parameters that the firmware actually transmits are listed.
// Keys must match firmware JSON keys exactly.

export const COMPONENTS: Record<Exclude<ComponentKey, "auto">, ComponentSpec> = {

  // ────────── BIPOLAR TRANSISTORS ──────────
  // Firmware sends: hfe (dimensionless integer), ice0 (with SI prefix + 'A')
  // pinOrder: "123=BCE" (or EBC etc, auto-detected)
  bjt: {
    key: "bjt",
    type: "NPN BJT",
    slug: "transistor",
    color: "text-bjt", bgColor: "bg-bjt/10", borderColor: "border-bjt/30",
    glow: "text-glow-bjt",
    primaryKey: "hfe",
    primaryLabel: "Current Gain",
    parameters: [
      {
        key: "hfe",
        label: "hFE",
        value: "182",
        unit: "",
        range: "1 – 9999",
        description: "DC current amplification factor (dimensionless)",
      },
      {
        key: "ice0",
        label: "ICE0",
        value: "12n",
        unit: "A",
        range: "pA – µA",
        description: "Collector cut-off current with base open (firmware sends SI prefix)",
      },
    ],
    pinLayout: {
      pins: ["B", "C", "E"],
      note: "Pin assignment from firmware pinOrder field (e.g. 123=BCE)",
    },
    flags: [
      { label: "Darlington pair", active: false },
      { label: "PNP polarity",   active: false },
    ],
  },

  // ────────── ENHANCEMENT MOSFET ──────────
  // Firmware sends: vth (mV, plain integer), cg (with SI prefix + 'F'), rds (optional, centi-Ω)
  mosfet: {
    key: "mosfet",
    type: "N-channel E-MOSFET",
    slug: "mosfet",
    color: "text-mosfet", bgColor: "bg-mosfet/10", borderColor: "border-mosfet/30",
    glow: "text-glow-mosfet",
    primaryKey: "vth",
    primaryLabel: "Gate Threshold",
    parameters: [
      {
        key: "vth",
        label: "Vth",
        value: "2100",
        unit: "V",
        range: "0.4 – 5 V",
        description: "Gate threshold voltage (firmware sends millivolts, no prefix)",
      },
      {
        key: "cg",
        label: "Cg",
        value: "1850p",
        unit: "F",
        range: "100 pF – 50 nF",
        description: "Gate capacitance (firmware sends with SI prefix + F)",
      },
      {
        key: "rds",
        label: "RDS(on)",
        value: "85",
        unit: "Ω",
        range: "0.01 – 10 Ω",
        description: "Drain–source on-resistance (firmware sends centi-Ω, optional)",
      },
    ],
    pinLayout: {
      pins: ["G", "D", "S"],
      note: "Pin assignment from firmware pinOrder field",
    },
    flags: [
      { label: "Internal body diode", active: false },
      { label: "P-channel polarity",  active: false },
      { label: "IGBT",                active: false },
    ],
  },

  // ────────── JFET ──────────
  // Firmware sends: vgs (mV signed), idss (optional, with SI prefix + 'A')
  jfet: {
    key: "jfet",
    type: "N-channel JFET",
    slug: "jfet",
    color: "text-jfet", bgColor: "bg-jfet/10", borderColor: "border-jfet/30",
    glow: "text-glow-jfet",
    primaryKey: "vgs",
    primaryLabel: "Vgs at Operating Point",
    parameters: [
      {
        key: "vgs",
        label: "Vgs",
        value: "-1420",
        unit: "V",
        range: "−5 V – +5 V",
        description: "Gate–source voltage at operating point (firmware sends mV signed)",
      },
      {
        key: "idss",
        label: "Idss",
        value: "4.1m",
        unit: "A",
        range: "µA – mA",
        description: "Drain current via 680 Ω source resistor (optional, SI prefix + A)",
      },
    ],
    pinLayout: {
      pins: ["G", "D", "S"],
      note: "Pin assignment from firmware pinOrder field",
    },
    flags: [
      { label: "P-channel polarity", active: false },
    ],
  },

  // ────────── DIODE ──────────
  // Firmware sends: vf (mV plain), cj (optional, SI prefix + 'F')
  // pinOrder: "1=A 2=K" (or reversed)
  diode: {
    key: "diode",
    type: "Diode",
    slug: "diode",
    color: "text-diode", bgColor: "bg-diode/10", borderColor: "border-diode/30",
    glow: "text-glow-diode",
    primaryKey: "vf",
    primaryLabel: "Forward Voltage",
    parameters: [
      {
        key: "vf",
        label: "Vf",
        value: "612",
        unit: "V",
        range: "0.1 – 4.5 V",
        description: "Forward voltage drop (firmware sends millivolts, no prefix)",
      },
      {
        key: "cj",
        label: "Cj",
        value: "47p",
        unit: "F",
        range: "5 pF – 1 nF",
        description: "Junction capacitance in reverse bias (optional, SI prefix + F)",
      },
    ],
    pinLayout: {
      pins: ["A", "K"],
      note: "Anode / Cathode from firmware pinOrder field",
    },
    flags: [
      { label: "Zener (dual-diode pattern)", active: false },
      { label: "LED (high Vf detected)",     active: false },
    ],
  },

  // ────────── THYRISTOR (SCR) ──────────
  // Firmware sends: type="SCR", vgt (optional, mV)
  // pinOrder: "123=GAK"
  thyristor: {
    key: "thyristor",
    type: "Thyristor (SCR)",
    slug: "thyristor",
    color: "text-thyristor", bgColor: "bg-thyristor/10", borderColor: "border-thyristor/30",
    glow: "text-glow-thyristor",
    primaryKey: "vgt",
    primaryLabel: "Gate Trigger Voltage",
    parameters: [
      {
        key: "type",
        label: "Type",
        value: "SCR",
        unit: "",
        range: "SCR",
        description: "Confirmed as Silicon Controlled Rectifier",
      },
      {
        key: "vgt",
        label: "Vgt",
        value: "800",
        unit: "V",
        range: "mV range",
        description: "Gate trigger voltage (optional, firmware sends mV)",
      },
    ],
    pinLayout: {
      pins: ["G", "A", "K"],
      note: "Gate / Anode / Cathode from firmware pinOrder field",
    },
    flags: [
      { label: "Holding current exceeds tester limit", active: false },
    ],
  },

  // ────────── TRIAC ──────────
  // Same firmware key ("thyristor") but type="Triac" — normalised in use-ble-feed.ts
  // pinOrder: "123=GM1M2"  (Gate, MT1, MT2)
  triac: {
    key: "triac",
    type: "Triac",
    slug: "thyristor",
    color: "text-thyristor", bgColor: "bg-thyristor/10", borderColor: "border-thyristor/30",
    glow: "text-glow-thyristor",
    primaryKey: "vgt",
    primaryLabel: "Gate Trigger Voltage",
    parameters: [
      {
        key: "type",
        label: "Type",
        value: "Triac",
        unit: "",
        range: "Triac",
        description: "Confirmed as Triac (bidirectional thyristor)",
      },
      {
        key: "vgt",
        label: "Vgt",
        value: "600",
        unit: "V",
        range: "mV range",
        description: "Gate trigger voltage (optional, firmware sends mV)",
      },
    ],
    pinLayout: {
      pins: ["G", "MT1", "MT2"],
      note: "Gate / Main Terminal 1 & 2 from firmware pinOrder field",
    },
    flags: [
      { label: "Bidirectional (Triac confirmed)", active: true },
    ],
  },

  // ────────── RESISTOR ──────────
  // Firmware sends: r (with SI prefix + 'O', e.g. "10.0kO")
  resistor: {
    key: "resistor",
    type: "Resistor",
    slug: "resistor",
    color: "text-resistor", bgColor: "bg-resistor/10", borderColor: "border-resistor/30",
    glow: "text-glow-resistor",
    primaryKey: "r",
    primaryLabel: "Resistance",
    parameters: [
      {
        key: "r",
        label: "R",
        value: "10.0k",
        unit: "Ω",
        range: "0.01 Ω – 50 MΩ",
        description: "Resistance (firmware sends with SI prefix + O, e.g. 10.0kO)",
      },
    ],
    // No pin layout — passive 2-terminal, probe order irrelevant
  },

  // ────────── CAPACITOR ──────────
  // Firmware sends: c (with SI prefix + 'F'), vloss (optional, tenths of %)
  capacitor: {
    key: "capacitor",
    type: "Capacitor",
    slug: "capacitor",
    color: "text-capacitor", bgColor: "bg-capacitor/10", borderColor: "border-capacitor/30",
    glow: "text-glow-capacitor",
    primaryKey: "c",
    primaryLabel: "Capacitance",
    parameters: [
      {
        key: "c",
        label: "C",
        value: "47.2u",
        unit: "F",
        range: "25 pF – 100 mF",
        description: "Capacitance (firmware sends with SI prefix + F, e.g. 47.2uF)",
      },
      {
        key: "vloss",
        label: "V-loss",
        value: "0.4",
        unit: "%",
        range: "for C > 5000 pF",
        description: "Voltage loss after load pulse — quality indicator (optional)",
      },
    ],
  },

  // ────────── INDUCTOR ──────────
  // Not yet transmitted by the firmware; entry reserved for future support.
  inductor: {
    key: "inductor",
    type: "Inductor",
    slug: "inductor",
    color: "text-inductor", bgColor: "bg-inductor/10", borderColor: "border-inductor/30",
    glow: "text-glow-inductor",
    primaryKey: "l",
    primaryLabel: "Inductance",
    parameters: [
      {
        key: "l",
        label: "L",
        value: "10.0u",
        unit: "H",
        range: "future",
        description: "Inductance (not yet emitted by firmware)",
      },
    ],
  },

  // ────────── FREQUENCY ──────────
  // Transmitted via signalFrequency field in BLE payload (not inside values{})
  frequency: {
    key: "frequency",
    type: "Frequency",
    slug: "frequency",
    color: "text-frequency", bgColor: "bg-frequency/10", borderColor: "border-frequency/30",
    glow: "text-glow-frequency",
    primaryKey: "fin",
    primaryLabel: "Input Frequency",
    parameters: [
      {
        key: "fin",
        label: "f (in)",
        value: "1000",
        unit: "Hz",
        range: "0.001 mHz – 2 MHz",
        description: "Input frequency at PD4",
      },
    ],
  },

  // ────────── VOLTAGE ──────────
  // Transmitted via externalVoltage field in BLE payload (not inside values{})
  voltage: {
    key: "voltage",
    type: "Voltage",
    slug: "voltage",
    color: "text-voltage", bgColor: "bg-voltage/10", borderColor: "border-voltage/30",
    glow: "text-glow-voltage",
    primaryKey: "vdc",
    primaryLabel: "DC Voltage",
    parameters: [
      {
        key: "vdc",
        label: "Vdc",
        value: "12.34",
        unit: "V",
        range: "0 – 50 V",
        description: "External DC voltage via 10:1 divider at PC3",
      },
    ],
    flags: [
      { label: "Voltage extension required", active: true },
    ],
  },
};

/** Ordered list for the chip selector. */
export const COMPONENT_ORDER: ComponentKey[] = [
  "auto", "bjt", "mosfet", "jfet", "diode", "thyristor", "triac",
  "resistor", "capacitor", "inductor", "frequency", "voltage",
];

/** Short display label for the chip selector. */
export const COMPONENT_SHORT_LABEL: Record<ComponentKey, string> = {
  auto:      "Auto",
  bjt:       "BJT",
  mosfet:    "MOSFET",
  jfet:      "JFET",
  diode:     "Diode",
  thyristor: "SCR",
  triac:     "Triac",
  resistor:  "Resistor",
  capacitor: "Capacitor",
  inductor:  "Inductor",
  frequency: "Frequency",
  voltage:   "Voltage",
};