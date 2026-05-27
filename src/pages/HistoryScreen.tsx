// ============================================================================
// HistoryScreen — shows real measurements fetched from the backend.
//
// Changes from the original:
//   • Fetches GET /api/measurements instead of using hardcoded records[]
//   • Shows loading / error states
//   • CSV export uses real data
// ============================================================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Download, RefreshCw } from "lucide-react";
import { measurementsApi, type Measurement } from "@/lib/api";

const TYPE_COLORS: Record<string, string> = {
  resistor:   "text-resistor",
  capacitor:  "text-capacitor",
  inductor:   "text-inductor",
  diode:      "text-diode",
  transistor: "text-primary",
  triac:      "text-primary",
  thyristor:  "text-primary",
};

const FILTERS = ["All", "resistor", "capacitor", "inductor", "diode"];

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function primaryValue(m: Measurement): { display: string; unit: string } {
  if (!m.values) return { display: "—", unit: "" };
  // Pick the first non-type, non-vloss value as the "main" reading
  const skip = new Set(["type", "vloss"]);
  for (const [key, val] of Object.entries(m.values)) {
    if (!skip.has(key)) return { display: val, unit: key.toUpperCase() };
  }
  return { display: "—", unit: "" };
}

// ── component ─────────────────────────────────────────────────────────────────

const HistoryScreen = () => {
  const [records, setRecords]     = useState<Measurement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch]       = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await measurementsApi.list();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // ── filtering ─────────────────────────────────────────────────────────────

  const filtered = records.filter((r) => {
    const type = (r.type ?? "").toLowerCase();
    if (activeFilter !== "All" && type !== activeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!type.includes(q) && !JSON.stringify(r.values ?? {}).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── CSV export ────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [
      ["Type", "Values", "Pin Order", "Signal Frequency", "External Voltage", "Timestamp"],
      ...filtered.map((r) => [
        r.type ?? "",
        JSON.stringify(r.values ?? {}),
        r.pinOrder ?? "",
        r.signalFrequency ?? "",
        r.externalVoltage ?? "",
        r.timestamp,
      ]),
    ];
    const csv = rows.map((r) => r.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `lcr-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pt-8 pb-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">History</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${records.length} measurements saved`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:text-foreground active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search measurements…"
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all capitalize ${
              activeFilter === f
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Records */}
      <div className="space-y-3">
        {loading && !error && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No measurements found
          </div>
        )}

        {filtered.map((record, i) => {
          const { display, unit } = primaryValue(record);
          const color = TYPE_COLORS[(record.type ?? "").toLowerCase()] ?? "text-muted-foreground";
          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-4 card-glow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold capitalize ${color}`}>{record.type ?? "Unknown"}</span>
                <span className="text-[10px] text-muted-foreground">{formatDate(record.timestamp)}</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="font-mono text-2xl font-bold">{display}</span>
                <span className="text-sm text-muted-foreground">{unit}</span>
              </div>
              {record.values && (
                <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  {Object.entries(record.values)
                    .filter(([k]) => !["type"].includes(k))
                    .map(([k, v]) => (
                      <span key={k}>{k.toUpperCase()}: {v}</span>
                    ))}
                  {record.pinOrder && <span>Pins: {record.pinOrder}</span>}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryScreen;
