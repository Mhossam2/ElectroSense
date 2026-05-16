import { motion } from "framer-motion";

const colorBands = [
  { color: "#000000", name: "Black", value: 0, multiplier: "1Ω", tolerance: "" },
  { color: "#8B4513", name: "Brown", value: 1, multiplier: "10Ω", tolerance: "±1%" },
  { color: "#FF0000", name: "Red", value: 2, multiplier: "100Ω", tolerance: "±2%" },
  { color: "#FF8C00", name: "Orange", value: 3, multiplier: "1kΩ", tolerance: "" },
  { color: "#FFD700", name: "Yellow", value: 4, multiplier: "10kΩ", tolerance: "" },
  { color: "#22C55E", name: "Green", value: 5, multiplier: "100kΩ", tolerance: "±0.5%" },
  { color: "#3B82F6", name: "Blue", value: 6, multiplier: "1MΩ", tolerance: "±0.25%" },
  { color: "#8B5CF6", name: "Violet", value: 7, multiplier: "10MΩ", tolerance: "±0.1%" },
  { color: "#6B7280", name: "Gray", value: 8, multiplier: "—", tolerance: "" },
  { color: "#F5F5F5", name: "White", value: 9, multiplier: "—", tolerance: "" },
  { color: "#C4A34A", name: "Gold", value: -1, multiplier: "0.1Ω", tolerance: "±5%" },
  { color: "#C0C0C0", name: "Silver", value: -1, multiplier: "0.01Ω", tolerance: "±10%" },
];

const COMMON: Record<string, string[]> = {
  resistor: ["10Ω", "100Ω", "220Ω", "330Ω", "470Ω", "1kΩ", "2.2kΩ", "4.7kΩ", "10kΩ", "47kΩ", "100kΩ", "1MΩ"],
  capacitor: ["10pF", "22pF", "100pF", "1nF", "10nF", "100nF", "1µF", "10µF", "47µF", "100µF", "470µF", "1000µF"],
  inductor: ["1µH", "4.7µH", "10µH", "22µH", "47µH", "100µH", "220µH", "470µH", "1mH", "10mH", "47mH", "100mH"],
};

const PINOUTS: Record<string, { name: string; pins: string[]; description: string }[]> = {
  bjt: [
    { name: "TO-92 (typical)", pins: ["E", "B", "C"], description: "Common: 2N2222, BC547 — flat side facing you" },
    { name: "SOT-23 SMD", pins: ["B", "E", "C"], description: "Common SMD package, 3 pins" },
    { name: "TO-220 Power", pins: ["B", "C", "E"], description: "Power BJTs like TIP31, BD139" },
  ],
  mosfet: [
    { name: "TO-220", pins: ["G", "D", "S"], description: "N-ch power: IRF540, IRFZ44N" },
    { name: "SOT-23 SMD", pins: ["G", "S", "D"], description: "Logic-level switching MOSFETs" },
    { name: "TO-247", pins: ["G", "D", "S"], description: "High-power MOSFETs" },
  ],
  diode: [
    { name: "DO-41 (axial)", pins: ["A", "K"], description: "Banded end = Cathode (K)" },
    { name: "LED 5mm", pins: ["A", "K"], description: "Long lead = Anode (+); flat side = Cathode" },
    { name: "SOD-123 SMD", pins: ["A", "K"], description: "Cathode marked with line on package" },
  ],
};

const EmbeddedReference = ({ slug, accent }: { slug: string; accent: string }) => {
  const common = COMMON[slug];
  const pinouts = PINOUTS[slug];

  return (
    <div className="space-y-3">
      {/* Resistor color code */}
      {slug === "resistor" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-secondary/40 p-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Color Code Bands
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="py-1 text-left text-muted-foreground font-medium">Color</th>
                  <th className="py-1 text-center text-muted-foreground font-medium">Digit</th>
                  <th className="py-1 text-center text-muted-foreground font-medium">Mult.</th>
                  <th className="py-1 text-right text-muted-foreground font-medium">Tol.</th>
                </tr>
              </thead>
              <tbody>
                {colorBands.map((b) => (
                  <tr key={b.name} className="border-b border-border/30">
                    <td className="py-1 flex items-center gap-1.5">
                      <div
                        className="h-3 w-5 rounded-sm border border-border"
                        style={{ backgroundColor: b.color }}
                      />
                      <span>{b.name}</span>
                    </td>
                    <td className="py-1 text-center font-mono">
                      {b.value >= 0 ? b.value : "—"}
                    </td>
                    <td className="py-1 text-center font-mono">{b.multiplier}</td>
                    <td className={`py-1 text-right font-mono ${accent}`}>
                      {b.tolerance || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Common values */}
      {common && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-lg bg-secondary/40 p-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Common Values You'll See
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {common.map((v) => (
              <div
                key={v}
                className="rounded-md bg-card border border-border/60 px-1.5 py-1 text-center font-mono text-[11px]"
              >
                {v}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pinouts */}
      {pinouts && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg bg-secondary/40 p-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Common Packages & Pinouts
          </p>
          <div className="space-y-2">
            {pinouts.map((p) => (
              <div key={p.name} className="flex items-center gap-2 rounded-md bg-card p-2 border border-border/60">
                <div className="flex items-center gap-0.5">
                  {p.pins.map((pin, i) => (
                    <div
                      key={i}
                      className={`flex h-7 w-7 items-center justify-center rounded border border-border bg-secondary text-[10px] font-mono font-bold ${accent}`}
                    >
                      {pin}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EmbeddedReference;
