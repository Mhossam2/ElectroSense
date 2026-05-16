// ============================================================================
// DASHBOARD — Smart LCR Lab
// ============================================================================

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Save, BookOpen, Zap, ArrowLeftRight, Cpu, Info, History,
  Radio, Waves, Gauge, Power, Play, Square as StopIcon, Pause as PauseIcon,
  Bluetooth, BluetoothOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  COMPONENTS,
  parseSIValue,
  formatSIValue,
  type ComponentKey,
  type Parameter,
} from "@/data/components";
import { GENERATORS, GENERATOR_ORDER, type GeneratorKey } from "@/data/generators";
import { useBleFeed } from "@/hooks/use-ble-feed";
import type { ParsedPinOrder } from "@/hooks/use-ble-feed";

type TopMode = "read" | "generate";
type ReadSub = "component" | "frequency" | "voltage";

const READ_SUBS: { key: ReadSub; label: string; icon: typeof Radio }[] = [
  { key: "component", label: "Component", icon: Cpu },
  { key: "frequency", label: "Frequency", icon: Waves },
  { key: "voltage",   label: "Voltage",   icon: Gauge },
];

// ── SI value formatting for display ─────────────────────────────────────────

/**
 * Given a raw firmware value string (e.g. "10.0k", "47.2u", "650", "1.85n")
 * and the parameter's base unit (e.g. "Ω", "F", "V", "A"),
 * returns a { display, unit } pair ready for the UI.
 *
 * Special cases:
 *  - vth/vgs/vf: firmware sends millivolts as plain integer ("2100" = 2.100 V)
 *    These parameters have baseUnit "V" and the value has no prefix → treated
 *    as millivolts automatically because parseSIValue picks up the missing prefix
 *    and formatSIValue rescales correctly.
 *  - hfe: dimensionless, no unit → returned verbatim.
 *  - type / vloss / "—": returned verbatim.
 */
function formatParam(
  rawVal: string,
  param: Parameter,
  connected: boolean,
): { display: string; unit: string } {
  // Disconnected or placeholder → show mock or dash as-is
  if (!connected || !rawVal || rawVal === "—") {
    return { display: connected ? "—" : rawVal, unit: param.unit };
  }

  // Dimensionless parameters (hfe, type, vloss %)
  if (!param.unit || param.unit === "%") {
    // Clean firmware unit chars
    const cleaned = rawVal
      .replace(/([0-9kmunpMG])O$/, "$1Ω")
      .replace(/([kmunpMG])[FAΩ]$/, "$1")
      .trim();
    return { display: cleaned, unit: param.unit };
  }

  // Try to parse an SI-prefixed value
  const parsed = parseSIValue(rawVal);
  if (!parsed) {
    // Fallback: clean and show raw
    const cleaned = rawVal
      .replace(/([0-9kmunpMG])O$/, "$1Ω")
      .replace(/([kmunpMG])[FAΩ]$/, "$1")
      .trim();
    return { display: cleaned, unit: param.unit };
  }

  // Special: vth / vgs / vf — firmware sends mV as a plain integer (no prefix).
  // parseSIValue will parse it as-is (e.g. 2100, prefix="").
  // We must treat the base value as millivolts → multiply by 1e-3.
  const mVParams = new Set(["vth", "vgs", "vf"]);
  let baseValue = parsed.baseValue;
  if (mVParams.has(param.key) && parsed.prefix === "") {
    // Plain integer from firmware is in millivolts
    baseValue = parsed.number * 1e-3;
  }

  // rds: firmware sends centi-Ω as plain integer → multiply by 1e-2
  if (param.key === "rds" && parsed.prefix === "") {
    baseValue = parsed.number * 1e-2;
  }

  return formatSIValue(baseValue, param.unit);
}

// ── Dashboard root ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();

  const [topMode, setTopMode]     = useState<TopMode>("read");
  const [readSub, setReadSub]     = useState<ReadSub>("component");
  const [genKey, setGenKey]       = useState<GeneratorKey>("psu");
  const [measuring, setMeasuring] = useState(true);

  const ble = useBleFeed({ paused: topMode === "generate" || !measuring });

  return (
    <div className="px-4 pt-6 pb-6 max-w-screen-md mx-auto">

      {/* ───────── STATUS BAR ───────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            ble.connected ? "bg-inductor" : "bg-muted-foreground/40"
          } ${ble.connected ? "animate-pulse-dot" : ""}`} />
          <span className="text-xs font-medium text-muted-foreground">
            {ble.connected
              ? (topMode === "read" ? "Measuring" : "Generating")
              : "Not connected"}
          </span>
        </div>

        {ble.bleSupported ? (
          ble.connected ? (
            <div className="flex items-center gap-1.5 text-xs text-inductor font-medium">
              <Bluetooth className="h-3 w-3" />
              <span>BLE</span>
            </div>
          ) : (
            <button
              onClick={ble.connect}
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10
                         px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20
                         active:scale-95 transition-all"
            >
              <Bluetooth className="h-3 w-3" />
              Connect
            </button>
          )
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <BluetoothOff className="h-3 w-3" />
            <span>BLE unsupported</span>
          </div>
        )}
      </motion.div>

      {/* ───────── TOP TOGGLE: READ ↔ GENERATE ───────── */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
        {(["read", "generate"] as TopMode[]).map((m) => {
          const active = topMode === m;
          const Icon = m === "read" ? Radio : Power;
          return (
            <button
              key={m}
              onClick={() => setTopMode(m)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                active
                  ? m === "read"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-voltage text-background shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {m === "read" ? "READ" : "GENERATE"}
            </button>
          );
        })}
      </div>

      {/* ───────── SUB-MODE CHIPS ───────── */}
      {topMode === "read" ? (
        <div className="mb-4 flex gap-1.5">
          {READ_SUBS.map(({ key, label, icon: Icon }) => {
            const active = readSub === key;
            return (
              <button
                key={key}
                onClick={() => setReadSub(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mb-4 flex gap-1.5">
          {GENERATOR_ORDER.map((k) => {
            const g = GENERATORS[k];
            const active = genKey === k;
            return (
              <button
                key={k}
                onClick={() => setGenKey(k)}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? `border-current/40 ${g.bgColor} ${g.color}`
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {g.short}
              </button>
            );
          })}
        </div>
      )}

      {/* ───────── START / PAUSE (READ mode only) ───────── */}
      {topMode === "read" && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMeasuring(true)}
            disabled={measuring}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
              measuring
                ? "bg-inductor/15 text-inductor border border-inductor/30 cursor-default"
                : "bg-inductor text-background hover:brightness-110"
            }`}
          >
            <Play className="h-4 w-4" />
            {measuring ? "Measuring…" : "Start"}
          </button>
          <button
            onClick={() => setMeasuring(false)}
            disabled={!measuring}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
              !measuring
                ? "bg-diode/15 text-diode border border-diode/30 cursor-default"
                : "bg-card text-muted-foreground border border-border hover:bg-secondary hover:text-foreground"
            }`}
          >
            <PauseIcon className="h-4 w-4" />
            {!measuring ? "Paused" : "Pause"}
          </button>
        </div>
      )}

      {/* ───────── CONTENT ───────── */}
      <AnimatePresence mode="wait">
        {topMode === "read" && readSub === "component" && (
          <motion.div key="comp" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ReadComponentView ble={ble} navigate={navigate} />
          </motion.div>
        )}
        {topMode === "read" && readSub === "frequency" && (
          <motion.div key="freq" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SingleValueView
              label="Input Frequency"
              value={ble.signalFrequency?.toFixed(0) ?? "—"}
              unit="Hz"
              colorClass="text-frequency"
              glow="text-glow-frequency"
              note="Input at PD4 · Range 0.001 mHz – 2 MHz"
              connected={ble.connected}
            />
          </motion.div>
        )}
        {topMode === "read" && readSub === "voltage" && (
          <motion.div key="volt" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SingleValueView
              label="External DC Voltage"
              value={ble.externalVoltage?.toFixed(2) ?? "—"}
              unit="V"
              colorClass="text-voltage"
              glow="text-glow-voltage"
              note="10:1 divider at PC3 · Range 0 – 50 V"
              connected={ble.connected}
            />
          </motion.div>
        )}
        {topMode === "generate" && (
          <motion.div key={`gen-${genKey}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GenerateView genKey={genKey} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── ACTION BAR (READ mode only) ───────── */}
      {topMode === "read" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 grid grid-cols-2 gap-2"
        >
          {[
            { label: "Save",    icon: Save,           path: null,                                                                                   accent: false },
            { label: "Learn",   icon: BookOpen,       path: ble.detected ? `/learn/${COMPONENTS[ble.detected]?.slug ?? ""}` : null,                 accent: true  },
            { label: "Compare", icon: ArrowLeftRight, path: "/comparison",                                                                          accent: false },
            { label: "History", icon: History,        path: "/history",                                                                             accent: false },
          ].map(({ label, icon: Icon, path, accent }) => (
            <button
              key={label}
              onClick={() => path && navigate(path)}
              disabled={!path}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                accent
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ============================================================================
// READ → COMPONENT (auto-detected)
// ============================================================================
const ReadComponentView = ({
  ble, navigate,
}: { ble: ReturnType<typeof useBleFeed>; navigate: ReturnType<typeof useNavigate> }) => {

  const comp = ble.detected ? COMPONENTS[ble.detected] : null;

  /**
   * Build display-ready params.
   * Each param gets a { display, unit } pair via formatParam(), which
   * handles SI prefix parsing and mV→V rescaling.
   */
  const params = useMemo(
    () => {
      if (!comp) return [];
      return comp.parameters.map((p) => {
        const rawVal = ble.connected ? (ble.values?.[p.key] ?? "—") : p.value;
        const { display, unit } = formatParam(
          typeof rawVal === "string" ? rawVal : String(rawVal),
          p,
          ble.connected,
        );
        return { ...p, value: display, unit };
      });
    },
    [comp, ble.values, ble.connected],
  );

  // ── Guard 1: no BLE connection ────────────────────────────────────────────
  if (!ble.connected) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <Bluetooth className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-semibold text-muted-foreground">Not connected</p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          Tap <span className="font-semibold text-primary">Connect</span> at the top to pair your Smart LCR Meter
        </p>
      </div>
    );
  }

  // ── Guard 2: connected but nothing on the probes yet ─────────────────────
  if (!ble.detected || !comp) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <Cpu className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-semibold text-muted-foreground">No component detected</p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          Place a component on the probes
        </p>
      </div>
    );
  }

  // ── Happy path ────────────────────────────────────────────────────────────
  const headline = params.find((p) => p.key === comp.primaryKey) ?? params[0];

  return (
    <>
      {/* Detected badge */}
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${comp.bgColor} ${comp.borderColor}`}>
        <Zap className={`h-3.5 w-3.5 ${comp.color}`} />
        <span className={`text-xs font-semibold ${comp.color}`}>
          Detected: {comp.type}
        </span>
        {ble.pinOrderRaw && (
          <span className="text-[10px] font-mono text-muted-foreground">· {ble.pinOrderRaw}</span>
        )}
      </div>

      {/* Headline measurement */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-6 card-glow text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          {comp.primaryLabel}
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <motion.span
            key={headline.value + headline.unit}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`font-mono text-6xl font-bold ${comp.color} ${comp.glow} tracking-tight`}
          >
            {headline.value}
          </motion.span>
          {headline.unit && (
            <span className="text-2xl font-medium text-muted-foreground">{headline.unit}</span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-inductor animate-pulse-dot" />
          <span className="text-xs text-inductor font-medium">Live</span>
        </div>
      </div>

      {/* All parameters grid */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            All Parameters
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {params.map((p) => (
            <div key={p.key} className="rounded-xl border border-border bg-card p-3 card-glow">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {p.label}
                </span>
                {p.unit && (
                  <span className="text-[10px] font-mono text-muted-foreground/70">{p.unit}</span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`font-mono text-xl font-semibold ${comp.color}`}>{p.value}</span>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground/80 leading-snug">
                <span className="font-medium">Range:</span> {p.range}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pin layout — driven by firmware pinOrder when available */}
      {comp.pinLayout && (
        <LivePinLayout
          comp={comp}
          pinOrder={ble.pinOrder}
        />
      )}

      {/* Detection flags */}
      {comp.flags && comp.flags.length > 0 && (
        <div className="mb-2 rounded-xl border border-border bg-card p-3 card-glow">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Detections
            </p>
          </div>
          <ul className="space-y-1.5">
            {comp.flags.map((f) => (
              <li key={f.label} className="flex items-center gap-2 text-xs">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${f.active ? "bg-inductor" : "bg-muted-foreground/30"}`} />
                <span className={f.active ? "text-foreground" : "text-muted-foreground/60"}>{f.label}</span>
                {f.active && (
                  <span className="ml-auto text-[10px] font-semibold uppercase text-inductor">Detected</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

// ============================================================================
// LIVE PIN LAYOUT
// Shows the component's canonical pin names with their actual physical probe
// numbers as reported by the firmware's pinOrder field.
//
// If pinOrder is available:
//   - Each circle shows the pin designator (B, C, E …)
//   - Below it: "Probe N" where N is the physical probe connected to that pin
//
// If pinOrder is null (2-terminal passives, or not yet received):
//   - Falls back to the static pinLayout.pins list without probe numbers
// ============================================================================

interface LivePinLayoutProps {
  comp: (typeof COMPONENTS)[keyof typeof COMPONENTS];
  pinOrder: ParsedPinOrder | null;
}

const LivePinLayout = ({ comp, pinOrder }: LivePinLayoutProps) => {
  if (!comp.pinLayout) return null;

  /**
   * Build the list of { pinName, probeNumber } to display.
   *
   * The firmware's probeMap maps probe number → pin designator.
   * We invert it: pin designator → probe number.
   * Then we walk comp.pinLayout.pins in canonical order.
   */
  const pinEntries: { pin: string; probe: string | null }[] = useMemo(() => {
    if (!pinOrder) {
      return comp.pinLayout!.pins.map((pin) => ({ pin, probe: null }));
    }

    // Invert probeMap: { "1":"B", "2":"C", "3":"E" } → { "B":"1", "C":"2", "E":"3" }
    const designatorToProbe: Record<string, string> = {};
    for (const [probeNum, desig] of Object.entries(pinOrder.probeMap)) {
      designatorToProbe[desig] = probeNum;
    }

    return comp.pinLayout!.pins.map((pin) => ({
      pin,
      probe: designatorToProbe[pin] ?? null,
    }));
  }, [comp.pinLayout, pinOrder]);

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-3 card-glow">
      <div className="flex items-center gap-1.5 mb-3">
        <Cpu className="h-3 w-3 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Pin Layout
        </p>
        {pinOrder && (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">
            {pinOrder.raw}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 py-2">
        {pinEntries.map(({ pin, probe }) => (
          <div key={pin} className="flex flex-col items-center gap-1.5">
            {/* Probe number badge (only when firmware pinOrder is available) */}
            {probe && (
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full
                               bg-muted text-muted-foreground border border-border`}>
                P{probe}
              </span>
            )}
            {/* Pin designator circle */}
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${comp.borderColor} ${comp.bgColor}`}>
              <span className={`font-mono text-sm font-bold ${comp.color} leading-none`}>{pin}</span>
            </div>
            {/* Fallback label when no probe number */}
            {!probe && (
              <span className="text-[10px] text-muted-foreground font-mono">—</span>
            )}
          </div>
        ))}
      </div>

      {/* Note line */}
      {comp.pinLayout.note && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground/80">
          {pinOrder ? `Auto-detected: ${pinOrder.raw}` : comp.pinLayout.note}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// READ → FREQUENCY / VOLTAGE — single-number view
// ============================================================================
const SingleValueView = ({
  label, value, unit, colorClass, glow, note, connected,
}: {
  label: string; value: string; unit: string;
  colorClass: string; glow: string; note: string;
  connected: boolean;
}) => (
  <div className="rounded-2xl border border-border bg-card p-8 card-glow text-center">
    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{label}</p>
    <div className="flex items-baseline justify-center gap-2">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        className={`font-mono text-7xl font-bold tracking-tight ${colorClass} ${glow}`}
      >
        {connected ? value : "—"}
      </motion.span>
      <span className="text-3xl font-medium text-muted-foreground">{unit}</span>
    </div>
    <div className="mt-4 flex items-center justify-center gap-1">
      {connected ? (
        <>
          <div className="h-1.5 w-1.5 rounded-full bg-inductor animate-pulse-dot" />
          <span className="text-xs text-inductor font-medium">Live</span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground/50">Not connected</span>
      )}
    </div>
    <p className="mt-4 text-[11px] text-muted-foreground/70">{note}</p>
  </div>
);

// ============================================================================
// GENERATE — DC PSU / Func Gen / PWM
// ============================================================================
const GenerateView = ({ genKey }: { genKey: GeneratorKey }) => {
  const g = GENERATORS[genKey];

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    GENERATOR_ORDER.forEach((k) =>
      GENERATORS[k].controls.forEach((c) => { init[`${k}:${c.key}`] = c.default; }),
    );
    return init;
  });
  const [waveform, setWaveform] = useState<string>(g.waveforms?.[0] ?? "Sine");
  const [running, setRunning] = useState(false);

  const set = (ck: string, v: number) =>
    setValues((p) => ({ ...p, [`${genKey}:${ck}`]: v }));

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border ${g.borderColor} ${g.bgColor} p-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${g.color}`}>{g.type}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{g.description}</p>
          </div>
          <div className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            running ? "bg-inductor/20 text-inductor" : "bg-muted text-muted-foreground"
          }`}>
            {running ? "● ON" : "○ OFF"}
          </div>
        </div>
      </div>

      {g.waveforms && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Waveform
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {g.waveforms.map((w) => (
              <button
                key={w}
                onClick={() => setWaveform(w)}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  waveform === w
                    ? `${g.bgColor} ${g.color} border border-current/30`
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {g.controls.map((c) => {
        const v = values[`${genKey}:${c.key}`];
        return (
          <div key={c.key} className="rounded-xl border border-border bg-card p-3 card-glow">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span className={`font-mono text-lg font-bold ${g.color}`}>
                {v.toLocaleString()} <span className="text-xs text-muted-foreground">{c.unit}</span>
              </span>
            </div>
            <input
              type="range"
              min={c.min} max={c.max} step={c.step} value={v}
              onChange={(e) => set(c.key, +e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] font-mono text-muted-foreground/60">{c.min}{c.unit}</span>
              <p className="text-[10px] text-muted-foreground/80">{c.description}</p>
              <span className="text-[9px] font-mono text-muted-foreground/60">{c.max}{c.unit}</span>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => setRunning((r) => !r)}
        className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98] ${
          running
            ? "bg-destructive text-destructive-foreground"
            : `${g.color} ${g.bgColor} border-2 border-current/40 hover:brightness-110`
        }`}
      >
        {running ? <StopIcon className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        {running ? "STOP OUTPUT" : "START OUTPUT"}
      </button>

      <p className="text-center text-[10px] text-muted-foreground/60">
        Hardware will receive these parameters via BLE when you press START.
      </p>
    </div>
  );
};

export default Dashboard;