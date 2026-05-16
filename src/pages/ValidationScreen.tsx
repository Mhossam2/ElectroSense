import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ValidationItem {
  name: string;
  expected: string;
  measured: string;
  deviation: number;
  status: "pass" | "warning" | "fail";
  color: string;
}

const items: ValidationItem[] = [
  { name: "R1", expected: "10kΩ", measured: "9.87kΩ", deviation: 1.3, status: "pass", color: "text-resistor" },
  { name: "R2", expected: "4.7kΩ", measured: "4.52kΩ", deviation: 3.8, status: "warning", color: "text-resistor" },
  { name: "C1", expected: "100nF", measured: "98.2nF", deviation: 1.8, status: "pass", color: "text-capacitor" },
  { name: "C2", expected: "47µF", measured: "38.1µF", deviation: 18.9, status: "fail", color: "text-capacitor" },
  { name: "L1", expected: "10µH", measured: "10.3µH", deviation: 3.0, status: "pass", color: "text-inductor" },
  { name: "D1", expected: "1N4148", measured: "Vf: 0.68V", deviation: 0, status: "pass", color: "text-diode" },
];

const statusConfig = {
  pass: { icon: CheckCircle2, label: "Within tolerance", color: "text-inductor", bg: "bg-inductor/10", border: "border-inductor/30" },
  warning: { icon: AlertTriangle, label: "Slight deviation", color: "text-mosfet", bg: "bg-mosfet/10", border: "border-mosfet/30" },
  fail: { icon: XCircle, label: "Out of range", color: "text-diode", bg: "bg-diode/10", border: "border-diode/30" },
};

const ValidationScreen = () => {
  const navigate = useNavigate();
  const passCount = items.filter(i => i.status === "pass").length;
  const warnCount = items.filter(i => i.status === "warning").length;
  const failCount = items.filter(i => i.status === "fail").length;

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Component Validation</h1>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 grid grid-cols-3 gap-3"
      >
        {[
          { label: "Pass", count: passCount, ...statusConfig.pass },
          { label: "Warning", count: warnCount, ...statusConfig.warning },
          { label: "Fail", count: failCount, ...statusConfig.fail },
        ].map(({ label, count, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-xl border ${border} ${bg} p-3 text-center`}>
            <Icon className={`h-5 w-5 ${color} mx-auto mb-1`} />
            <p className={`text-2xl font-bold font-mono ${color}`}>{count}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item, i) => {
          const config = statusConfig[item.status];
          const StatusIcon = config.icon;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border ${config.border} bg-card p-4 card-glow`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm font-bold ${item.color}`}>{item.name}</span>
                  <StatusIcon className={`h-4 w-4 ${config.color}`} />
                </div>
                {item.deviation > 0 && (
                  <span className={`text-xs font-mono font-semibold ${config.color}`}>
                    {item.status === "fail" ? "+" : ""}
                    {item.deviation.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Expected</p>
                  <p className="text-sm font-mono font-medium">{item.expected}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Measured</p>
                  <p className="text-sm font-mono font-medium">{item.measured}</p>
                </div>
              </div>
              {/* Deviation bar */}
              {item.deviation > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.status === "pass" ? "bg-inductor" : item.status === "warning" ? "bg-mosfet" : "bg-diode"
                      }`}
                      style={{ width: `${Math.min(item.deviation * 5, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ValidationScreen;
