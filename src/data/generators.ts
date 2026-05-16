// ============================================================================
// GENERATOR SPECS — what the hardware can OUTPUT
// ============================================================================
// Three families, each with a minimal set of essential controls.
// The shape lets the Dashboard render every output mode from one map.
// ============================================================================

export type GeneratorKey = "psu" | "funcgen" | "pwm";

export interface GeneratorControl {
  key: string;                            // unique id within the generator
  label: string;                          // user-facing label
  unit?: string;                          // suffix shown after the value
  min: number;
  max: number;
  step: number;
  default: number;
  description?: string;
}

export interface GeneratorSpec {
  key: GeneratorKey;
  type: string;                           // human name e.g. "DC Power Supply"
  short: string;                          // chip label
  color: string;                          // tailwind text color class
  bgColor: string;
  borderColor: string;
  glow: string;
  description: string;                    // one-line tagline
  controls: GeneratorControl[];
  /** For Func Gen — picker of waveform shape. */
  waveforms?: string[];
}

export const GENERATORS: Record<GeneratorKey, GeneratorSpec> = {
  psu: {
    key: "psu",
    type: "DC Power Supply",
    short: "DC PSU",
    color: "text-voltage",
    bgColor: "bg-voltage/10",
    borderColor: "border-voltage/30",
    glow: "text-glow-voltage",
    description: "Adjustable regulated DC output with current limit.",
    controls: [
      { key: "voltage", label: "Voltage", unit: "V",  min: 0, max: 25,  step: 0.1, default: 5.0,  description: "Output voltage" },
      { key: "ilimit",  label: "Current Limit", unit: "mA", min: 0, max: 500, step: 10,  default: 100, description: "Hardware current limit" },
    ],
  },
  funcgen: {
    key: "funcgen",
    type: "Function Generator",
    short: "Func Gen",
    color: "text-frequency",
    bgColor: "bg-frequency/10",
    borderColor: "border-frequency/30",
    glow: "text-glow-frequency",
    description: "Sine / square / triangle output up to 2 MHz.",
    waveforms: ["Sine", "Square", "Triangle"],
    controls: [
      { key: "freq", label: "Frequency", unit: "Hz", min: 1,    max: 2_000_000, step: 1,   default: 1000, description: "Output frequency at TP2" },
      { key: "amp",  label: "Amplitude", unit: "V",  min: 0,    max: 5,         step: 0.1, default: 3.3,  description: "Peak-to-peak amplitude" },
    ],
  },
  pwm: {
    key: "pwm",
    type: "PWM Generator",
    short: "PWM",
    color: "text-mosfet",
    bgColor: "bg-mosfet/10",
    borderColor: "border-mosfet/30",
    glow: "text-glow-mosfet",
    description: "Fixed-frequency PWM with adjustable duty cycle.",
    controls: [
      { key: "freq", label: "Frequency", unit: "Hz", min: 1,   max: 200_000, step: 1, default: 10_000, description: "PWM carrier frequency" },
      { key: "duty", label: "Duty cycle", unit: "%", min: 0,   max: 100,     step: 1, default: 50,     description: "On-time percentage" },
    ],
  },
};

export const GENERATOR_ORDER: GeneratorKey[] = ["psu", "funcgen", "pwm"];
