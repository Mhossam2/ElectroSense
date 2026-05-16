import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Calculator as CalcIcon } from "lucide-react";

type Mode =
  | "series-r"
  | "parallel-r"
  | "voltage-divider"
  | "rc-time"
  | "series-c"
  | "parallel-c"
  | "lc-freq"
  | "xl"
  | "led-resistor"
  | "diode-power";

interface ModeDef {
  id: Mode;
  label: string;
  formula: string;
}

const MODES_BY_SLUG: Record<string, ModeDef[]> = {
  resistor: [
    { id: "series-r", label: "Series R", formula: "R_total = R1 + R2 + ..." },
    { id: "parallel-r", label: "Parallel R", formula: "1/R_total = 1/R1 + 1/R2 + ..." },
    { id: "voltage-divider", label: "V Divider", formula: "Vout = Vin × R2 / (R1 + R2)" },
    { id: "led-resistor", label: "LED Resistor", formula: "R = (Vs − Vf) / I" },
  ],
  capacitor: [
    { id: "series-c", label: "Series C", formula: "1/C_total = 1/C1 + 1/C2 + ..." },
    { id: "parallel-c", label: "Parallel C", formula: "C_total = C1 + C2 + ..." },
    { id: "rc-time", label: "RC Time", formula: "τ = R × C" },
  ],
  inductor: [
    { id: "lc-freq", label: "LC Resonance", formula: "f = 1 / (2π√(LC))" },
    { id: "xl", label: "Reactance X_L", formula: "X_L = 2πfL" },
  ],
  diode: [
    { id: "led-resistor", label: "LED Resistor", formula: "R = (Vs − Vf) / I" },
    { id: "diode-power", label: "Diode Power", formula: "P = Vf × I" },
  ],
};

const EmbeddedCalculator = ({ slug, accent }: { slug: string; accent: string }) => {
  const modes = MODES_BY_SLUG[slug];
  const [mode, setMode] = useState<Mode | null>(modes?.[0]?.id ?? null);
  const [values, setValues] = useState<string[]>(["10000", "4700"]);
  const [r1, setR1] = useState("220");
  const [r2, setR2] = useState("4700");
  const [vin, setVin] = useState("5");
  const [vf, setVf] = useState("2.0");
  const [iLed, setILed] = useState("0.02");
  const [cap, setCap] = useState("0.0000001");
  const [ind, setInd] = useState("0.00001");
  const [freq, setFreq] = useState("1000");
  const [diodeI, setDiodeI] = useState("0.1");

  if (!modes || !mode) return null;

  const nums = values.map(Number).filter((n) => !isNaN(n) && n > 0);
  let result = "";
  let resultLabel = "";

  switch (mode) {
    case "series-r":
      result = formatR(nums.reduce((a, b) => a + b, 0));
      resultLabel = "Total Resistance";
      break;
    case "parallel-r":
      if (nums.length)
        result = formatR(1 / nums.reduce((a, b) => a + 1 / b, 0));
      resultLabel = "Total Resistance";
      break;
    case "series-c":
      if (nums.length)
        result = formatC(1 / nums.reduce((a, b) => a + 1 / b, 0));
      resultLabel = "Total Capacitance";
      break;
    case "parallel-c":
      result = formatC(nums.reduce((a, b) => a + b, 0));
      resultLabel = "Total Capacitance";
      break;
    case "voltage-divider": {
      const a = +r1, b = +r2, v = +vin;
      if (a > 0 && b > 0 && v > 0) {
        result = ((v * b) / (a + b)).toFixed(3) + " V";
        resultLabel = "Output Voltage";
      }
      break;
    }
    case "led-resistor": {
      const v = +vin, vfn = +vf, i = +iLed;
      if (v > vfn && i > 0) {
        result = formatR((v - vfn) / i);
        resultLabel = "Series Resistor";
      }
      break;
    }
    case "diode-power": {
      const vfn = +vf, i = +diodeI;
      if (vfn > 0 && i > 0) {
        result = formatPower(vfn * i);
        resultLabel = "Power Dissipated";
      }
      break;
    }
    case "rc-time": {
      const r = +r1, c = +cap;
      if (r > 0 && c > 0) {
        result = formatTime(r * c);
        resultLabel = "Time Constant (τ)";
      }
      break;
    }
    case "lc-freq": {
      const l = +ind, c = +cap;
      if (l > 0 && c > 0) {
        result = formatFreq(1 / (2 * Math.PI * Math.sqrt(l * c)));
        resultLabel = "Resonant Frequency";
      }
      break;
    }
    case "xl": {
      const l = +ind, f = +freq;
      if (l > 0 && f > 0) {
        result = formatR(2 * Math.PI * f * l);
        resultLabel = "Reactance X_L";
      }
      break;
    }
  }

  const activeMode = modes.find((m) => m.id === mode) ?? modes[0];
  const activeId = activeMode.id;
  const isMulti = activeId === "series-r" || activeId === "parallel-r" || activeId === "series-c" || activeId === "parallel-c";
  const valueUnit = activeId.includes("-c") ? "F" : "Ω";
  const valueColor = activeId.includes("-c") ? "text-capacitor" : "text-resistor";

  return (
    <div>
      {/* Mode chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
              activeId === m.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <motion.div
          key={result}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center"
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {resultLabel}
          </p>
          <p className="font-mono text-2xl font-bold text-primary text-glow-primary">{result}</p>
        </motion.div>
      )}

      {/* Inputs */}
      <div className="rounded-lg bg-secondary/40 p-3 space-y-2">
        {isMulti && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Values ({valueUnit})
            </p>
            {values.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-[11px] font-mono ${valueColor} w-7`}>
                  {valueUnit === "F" ? "C" : "R"}
                  {i + 1}
                </span>
                <input
                  value={v}
                  onChange={(e) =>
                    setValues(values.map((x, idx) => (idx === i ? e.target.value : x)))
                  }
                  className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 font-mono text-xs focus:border-primary/50 focus:outline-none"
                />
                {values.length > 2 && (
                  <button
                    onClick={() => setValues(values.filter((_, idx) => idx !== i))}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setValues([...values, ""])}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-[10px] text-muted-foreground hover:text-primary hover:border-primary/30"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </>
        )}

        {activeId === "voltage-divider" && (
          <>
            <Field label="Vin (V)" value={vin} onChange={setVin} prefix="V" />
            <Field label="R1 (Ω)" value={r1} onChange={setR1} prefix="R1" />
            <Field label="R2 (Ω)" value={r2} onChange={setR2} prefix="R2" />
          </>
        )}
        {activeId === "led-resistor" && (
          <>
            <Field label="Supply Voltage (V)" value={vin} onChange={setVin} prefix="Vs" />
            <Field label="LED Forward V (V)" value={vf} onChange={setVf} prefix="Vf" />
            <Field label="LED Current (A)" value={iLed} onChange={setILed} prefix="I" />
          </>
        )}
        {activeId === "diode-power" && (
          <>
            <Field label="Forward Voltage (V)" value={vf} onChange={setVf} prefix="Vf" />
            <Field label="Current (A)" value={diodeI} onChange={setDiodeI} prefix="I" />
          </>
        )}
        {activeId === "rc-time" && (
          <>
            <Field label="Resistance (Ω)" value={r1} onChange={setR1} prefix="R" />
            <Field label="Capacitance (F)" value={cap} onChange={setCap} prefix="C" />
          </>
        )}
        {activeId === "lc-freq" && (
          <>
            <Field label="Inductance (H)" value={ind} onChange={setInd} prefix="L" />
            <Field label="Capacitance (F)" value={cap} onChange={setCap} prefix="C" />
          </>
        )}
        {activeId === "xl" && (
          <>
            <Field label="Inductance (H)" value={ind} onChange={setInd} prefix="L" />
            <Field label="Frequency (Hz)" value={freq} onChange={setFreq} prefix="f" />
          </>
        )}
      </div>

      {/* Formula */}
      <div className="mt-2 flex items-center gap-2 rounded-md bg-secondary/30 px-2.5 py-1.5">
        <CalcIcon className={`h-3 w-3 ${accent} shrink-0`} />
        <code className={`font-mono text-[11px] ${accent}`}>{activeMode.formula}</code>
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix: string;
}) => (
  <div>
    <p className="text-[10px] font-medium text-muted-foreground mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-muted-foreground w-7">{prefix}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 font-mono text-xs focus:border-primary/50 focus:outline-none"
      />
    </div>
  </div>
);

function formatR(r: number) {
  if (r >= 1e6) return (r / 1e6).toFixed(2) + " MΩ";
  if (r >= 1e3) return (r / 1e3).toFixed(2) + " kΩ";
  return r.toFixed(2) + " Ω";
}
function formatC(c: number) {
  if (c >= 1e-3) return (c * 1e3).toFixed(2) + " mF";
  if (c >= 1e-6) return (c * 1e6).toFixed(2) + " µF";
  if (c >= 1e-9) return (c * 1e9).toFixed(2) + " nF";
  return (c * 1e12).toFixed(2) + " pF";
}
function formatTime(t: number) {
  if (t >= 1) return t.toFixed(3) + " s";
  if (t >= 1e-3) return (t * 1e3).toFixed(3) + " ms";
  if (t >= 1e-6) return (t * 1e6).toFixed(3) + " µs";
  return (t * 1e9).toFixed(3) + " ns";
}
function formatFreq(f: number) {
  if (f >= 1e9) return (f / 1e9).toFixed(2) + " GHz";
  if (f >= 1e6) return (f / 1e6).toFixed(2) + " MHz";
  if (f >= 1e3) return (f / 1e3).toFixed(2) + " kHz";
  return f.toFixed(2) + " Hz";
}
function formatPower(p: number) {
  if (p >= 1) return p.toFixed(3) + " W";
  if (p >= 1e-3) return (p * 1e3).toFixed(2) + " mW";
  return (p * 1e6).toFixed(2) + " µW";
}

export default EmbeddedCalculator;
