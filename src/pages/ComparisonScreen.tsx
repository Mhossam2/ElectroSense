// ============================================================================
// ComparisonScreen — side-by-side comparison using real history from the API
// ============================================================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowLeftRight, ChevronDown, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { measurementsApi, type Measurement } from "@/lib/api";
import { parseSIValue, formatSIValue, COMPONENTS } from "@/data/components";
import type { ComponentKey } from "@/data/components";

// ── helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  resistor:  "text-resistor",
  capacitor: "text-capacitor",
  inductor:  "text-inductor",
  diode:     "text-diode",
  bjt:       "text-bjt",
  mosfet:    "text-mosfet",
  jfet:      "text-jfet",
  thyristor: "text-thyristor",
  triac:     "text-thyristor",
};

/** Extract a display label + numeric base value from a measurement for comparison. */
function primaryDisplay(m: Measurement): { label: string; base: number | null; unit: string } {
  if (!m.type || !m.values) return { label: "—", base: null, unit: "" };

  const spec = COMPONENTS[m.type as Exclude<ComponentKey, "auto" | "frequency" | "voltage">];
  if (!spec) return { label: "—", base: null, unit: "" };

  const pk   = spec.primaryKey;
  const raw  = m.values[pk];
  if (!raw) return { label: "—", base: null, unit: "" };

  const parsed = parseSIValue(raw);
  if (!parsed) return { label: raw, base: null, unit: spec.parameters.find(p => p.key === pk)?.unit ?? "" };

  const baseUnit = spec.parameters.find(p => p.key === pk)?.unit ?? "";
  const { display, unit } = formatSIValue(parsed.baseValue, baseUnit);
  return { label: `${display} ${unit}`, base: parsed.baseValue, unit };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortLabel(m: Measurement): string {
  const { label } = primaryDisplay(m);
  const type = m.type ? m.type.charAt(0).toUpperCase() + m.type.slice(1) : "?";
  return `${type} · ${label} · ${formatDate(m.timestamp)}`;
}

// ── component ─────────────────────────────────────────────────────────────────

const ComparisonScreen = () => {
  const navigate = useNavigate();

  const [records, setRecords]   = useState<Measurement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [leftId, setLeftId]     = useState<string | null>(null);
  const [rightId, setRightId]   = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await measurementsApi.list();
      setRecords(data);
      if (data.length >= 1) setLeftId(data[0].id);
      if (data.length >= 2) setRightId(data[1].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load measurements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const left  = records.find(r => r.id === leftId)  ?? null;
  const right = records.find(r => r.id === rightId) ?? null;

  const leftPrim  = left  ? primaryDisplay(left)  : null;
  const rightPrim = right ? primaryDisplay(right) : null;

  const deviation =
    leftPrim?.base !== null && rightPrim?.base !== null &&
    leftPrim?.base !== undefined && rightPrim?.base !== undefined &&
    leftPrim.base !== 0
      ? Math.abs(((leftPrim.base - rightPrim.base) / leftPrim.base) * 100)
      : null;

  return (
    <div className="px-4 pt-8 pb-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Compare</h1>
            <p className="text-xs text-muted-foreground">Side-by-side from your history</p>
          </div>
        </div>
        <button onClick={load} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3 mb-6">
          <div className="h-16 rounded-xl border border-border bg-card animate-pulse" />
          <div className="h-16 rounded-xl border border-border bg-card animate-pulse" />
        </div>
      )}

      {!loading && records.length < 2 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Need at least 2 saved measurements to compare.
          <br />Probe some components first — they save automatically.
        </div>
      )}

      {!loading && records.length >= 2 && (
        <>
          {/* Selectors */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 mb-6">
            <Selector
              records={records}
              selectedId={leftId}
              onChange={setLeftId}
              label="Measurement A"
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card mb-0.5">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <Selector
              records={records}
              selectedId={rightId}
              onChange={setRightId}
              label="Measurement B"
            />
          </div>

          {/* Deviation badge */}
          {deviation !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 rounded-xl border p-4 text-center ${
                deviation < 2  ? "border-inductor/30 bg-inductor/5" :
                deviation < 10 ? "border-mosfet/30 bg-mosfet/5"    :
                                 "border-diode/30 bg-diode/5"
              }`}
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Deviation</p>
              <p className={`font-mono text-3xl font-bold ${
                deviation < 2 ? "text-inductor" : deviation < 10 ? "text-mosfet" : "text-diode"
              }`}>
                {deviation.toFixed(2)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {deviation < 2 ? "Excellent match" : deviation < 10 ? "Acceptable tolerance" : "Significant difference"}
              </p>
            </motion.div>
          )}

          {/* Comparison table */}
          {left && right && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-xl border border-border bg-card card-glow overflow-hidden"
            >
              <Row
                label="Value"
                leftValue={leftPrim?.label ?? "—"}
                rightValue={rightPrim?.label ?? "—"}
                leftColor={TYPE_COLOR[left.type ?? ""] ?? ""}
                rightColor={TYPE_COLOR[right.type ?? ""] ?? ""}
                highlight
              />
              <Row
                label="Type"
                leftValue={left.type ?? "—"}
                rightValue={right.type ?? "—"}
                leftColor={TYPE_COLOR[left.type ?? ""] ?? ""}
                rightColor={TYPE_COLOR[right.type ?? ""] ?? ""}
              />
              {/* All shared param keys */}
              {(() => {
                if (!left.values || !right.values) return null;
                const keys = [...new Set([...Object.keys(left.values), ...Object.keys(right.values)])];
                return keys.map(k => {
                  const lv = left.values?.[k] ?? "—";
                  const rv = right.values?.[k] ?? "—";
                  return (
                    <Row
                      key={k}
                      label={k.toUpperCase()}
                      leftValue={lv}
                      rightValue={rv}
                    />
                  );
                });
              })()}
              <Row
                label="Pin order"
                leftValue={left.pinOrder ?? "—"}
                rightValue={right.pinOrder ?? "—"}
              />
              <Row
                label="Date"
                leftValue={formatDate(left.timestamp)}
                rightValue={formatDate(right.timestamp)}
              />
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

// ── sub-components ────────────────────────────────────────────────────────────

const Selector = ({
  records, selectedId, onChange, label,
}: {
  records: Measurement[];
  selectedId: string | null;
  onChange: (id: string) => void;
  label: string;
}) => (
  <div className="relative">
    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    <select
      value={selectedId ?? ""}
      onChange={e => onChange(e.target.value)}
      className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium focus:border-primary/50 focus:outline-none pr-8"
    >
      {records.map(r => (
        <option key={r.id} value={r.id}>{shortLabel(r)}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-2 bottom-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
  </div>
);

const Row = ({
  label, leftValue, rightValue, leftColor, rightColor, highlight,
}: {
  label: string;
  leftValue: string;
  rightValue: string;
  leftColor?: string;
  rightColor?: string;
  highlight?: boolean;
}) => (
  <div className={`grid grid-cols-[1fr_auto_1fr] border-b border-border/50 last:border-0 ${highlight ? "bg-secondary/30" : ""}`}>
    <div className={`px-4 py-3 text-right ${highlight ? "font-mono font-bold" : "text-xs"} ${leftColor ?? ""}`}>
      {leftValue}
    </div>
    <div className="flex items-center justify-center px-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
    <div className={`px-4 py-3 text-left ${highlight ? "font-mono font-bold" : "text-xs"} ${rightColor ?? ""}`}>
      {rightValue}
    </div>
  </div>
);

export default ComparisonScreen;
