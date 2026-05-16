import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowLeftRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Measurement {
  id: string;
  label: string;
  type: string;
  value: number;
  unit: string;
  esr: number;
  phase: number;
  frequency: string;
  date: string;
  color: string;
}

const savedMeasurements: Measurement[] = [
  { id: "1", label: "Cap A", type: "Capacitor", value: 47.2, unit: "µF", esr: 0.23, phase: -89.2, frequency: "1kHz", date: "Mar 5, 14:32", color: "text-capacitor" },
  { id: "2", label: "Cap B", type: "Capacitor", value: 46.8, unit: "µF", esr: 0.31, phase: -88.7, frequency: "1kHz", date: "Mar 5, 14:35", color: "text-capacitor" },
  { id: "3", label: "Res 10k", type: "Resistor", value: 10.02, unit: "kΩ", esr: 0, phase: 0.1, frequency: "1kHz", date: "Mar 5, 14:28", color: "text-resistor" },
  { id: "4", label: "Res 4.7k", type: "Resistor", value: 4.67, unit: "kΩ", esr: 0, phase: 0.2, frequency: "1kHz", date: "Mar 4, 16:20", color: "text-resistor" },
  { id: "5", label: "Ind 220µH", type: "Inductor", value: 220, unit: "µH", esr: 1.2, phase: 88.5, frequency: "1kHz", date: "Mar 5, 13:55", color: "text-inductor" },
];

const ComparisonScreen = () => {
  const navigate = useNavigate();
  const [leftId, setLeftId] = useState(savedMeasurements[0].id);
  const [rightId, setRightId] = useState(savedMeasurements[1].id);

  const left = savedMeasurements.find(m => m.id === leftId)!;
  const right = savedMeasurements.find(m => m.id === rightId)!;

  const deviation = left && right && left.unit === right.unit
    ? Math.abs(((left.value - right.value) / left.value) * 100)
    : null;

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Compare</h1>
          <p className="text-xs text-muted-foreground">Side-by-side measurement comparison</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-6">
        <MeasurementSelector
          measurements={savedMeasurements}
          selected={leftId}
          onChange={setLeftId}
          label="Measurement A"
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <MeasurementSelector
          measurements={savedMeasurements}
          selected={rightId}
          onChange={setRightId}
          label="Measurement B"
        />
      </div>

      {/* Deviation badge */}
      {deviation !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 rounded-xl border p-4 text-center ${
            deviation < 2 ? "border-inductor/30 bg-inductor/5" :
            deviation < 10 ? "border-mosfet/30 bg-mosfet/5" :
            "border-diode/30 bg-diode/5"
          }`}
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Deviation</p>
          <p className={`font-mono text-3xl font-bold ${
            deviation < 2 ? "text-inductor" : deviation < 10 ? "text-mosfet" : "text-diode"
          }`}>
            {deviation.toFixed(2)}%
          </p>
        </motion.div>
      )}

      {/* Comparison table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card card-glow overflow-hidden"
      >
        <ComparisonRow label="Value" leftValue={`${left.value} ${left.unit}`} rightValue={`${right.value} ${right.unit}`} leftColor={left.color} rightColor={right.color} highlight />
        <ComparisonRow label="Type" leftValue={left.type} rightValue={right.type} leftColor={left.color} rightColor={right.color} />
        <ComparisonRow label="ESR" leftValue={left.esr > 0 ? `${left.esr} Ω` : "—"} rightValue={right.esr > 0 ? `${right.esr} Ω` : "—"} />
        <ComparisonRow label="Phase" leftValue={`${left.phase}°`} rightValue={`${right.phase}°`} />
        <ComparisonRow label="Frequency" leftValue={left.frequency} rightValue={right.frequency} />
        <ComparisonRow label="Date" leftValue={left.date} rightValue={right.date} />
      </motion.div>
    </div>
  );
};

const MeasurementSelector = ({ measurements, selected, onChange, label }: {
  measurements: Measurement[]; selected: string; onChange: (id: string) => void; label: string;
}) => {
  const current = measurements.find(m => m.id === selected);
  return (
    <div className="relative">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <select
        value={selected}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium focus:border-primary/50 focus:outline-none pr-8"
      >
        {measurements.map(m => (
          <option key={m.id} value={m.id}>{m.label} — {m.value}{m.unit}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 bottom-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
};

const ComparisonRow = ({ label, leftValue, rightValue, leftColor, rightColor, highlight }: {
  label: string; leftValue: string; rightValue: string; leftColor?: string; rightColor?: string; highlight?: boolean;
}) => (
  <div className={`grid grid-cols-[1fr_auto_1fr] border-b border-border/50 last:border-0 ${highlight ? "bg-secondary/30" : ""}`}>
    <div className={`px-4 py-3 text-right ${highlight ? "font-mono font-bold" : "text-xs"} ${leftColor || ""}`}>{leftValue}</div>
    <div className="flex items-center justify-center px-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
    <div className={`px-4 py-3 text-left ${highlight ? "font-mono font-bold" : "text-xs"} ${rightColor || ""}`}>{rightValue}</div>
  </div>
);

export default ComparisonScreen;
