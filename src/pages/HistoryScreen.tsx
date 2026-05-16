import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, Filter } from "lucide-react";

interface MeasurementRecord {
  id: string;
  type: string;
  value: string;
  unit: string;
  esr: string;
  frequency: string;
  date: string;
  color: string;
}

const records: MeasurementRecord[] = [
  { id: "1", type: "Capacitor", value: "47.2", unit: "µF", esr: "0.23Ω", frequency: "1kHz", date: "2026-03-05 14:32", color: "text-capacitor" },
  { id: "2", type: "Resistor", value: "10.02", unit: "kΩ", esr: "—", frequency: "1kHz", date: "2026-03-05 14:28", color: "text-resistor" },
  { id: "3", type: "Inductor", value: "220", unit: "µH", esr: "1.2Ω", frequency: "1kHz", date: "2026-03-05 13:55", color: "text-inductor" },
  { id: "4", type: "Capacitor", value: "100", unit: "nF", esr: "0.05Ω", frequency: "10kHz", date: "2026-03-05 13:41", color: "text-capacitor" },
  { id: "5", type: "Resistor", value: "4.67", unit: "kΩ", esr: "—", frequency: "1kHz", date: "2026-03-04 16:20", color: "text-resistor" },
  { id: "6", type: "Diode", value: "0.68", unit: "V", esr: "—", frequency: "—", date: "2026-03-04 15:50", color: "text-diode" },
];

const filters = ["All", "Resistor", "Capacitor", "Inductor", "Diode"];

const HistoryScreen = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = records.filter((r) => {
    if (activeFilter !== "All" && r.type !== activeFilter) return false;
    if (search && !r.type.toLowerCase().includes(search.toLowerCase()) && !r.value.includes(search)) return false;
    return true;
  });

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">History</h1>
          <p className="text-sm text-muted-foreground">{records.length} measurements saved</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search measurements..."
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeFilter === f
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Records */}
      <div className="space-y-3">
        {filtered.map((record, i) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card p-4 card-glow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${record.color}`}>{record.type}</span>
              <span className="text-[10px] text-muted-foreground">{record.date}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="font-mono text-2xl font-bold">{record.value}</span>
              <span className="text-sm text-muted-foreground">{record.unit}</span>
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              <span>ESR: {record.esr}</span>
              <span>f: {record.frequency}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HistoryScreen;
