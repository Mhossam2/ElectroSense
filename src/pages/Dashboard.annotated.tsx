// ============================================================================
// DASHBOARD — Smart LCR Lab  (ANNOTATED COPY)
// ----------------------------------------------------------------------------
// This file is a line-by-line walkthrough of `Dashboard.tsx` with every
// Tailwind class explained inline. It is NOT imported anywhere and is safe to
// read as documentation only. The behaviour is identical to the live page.
//
// HOW TAILWIND WORKS (quick refresher):
//   • Each class is a single CSS rule (e.g. `mb-4` → `margin-bottom: 1rem`).
//   • Numbers are spacing units → 1 unit = 0.25rem = 4px. So `p-3` = 12px.
//   • Prefixes: `hover:`, `active:`, `md:` apply on state / breakpoint.
//   • Square brackets `[10px]` are arbitrary values when no preset exists.
//   • Slash syntax `bg-primary/10` = primary color at 10% opacity.
//   • Our custom tokens (primary, voltage, frequency, inductor, …) come from
//     `index.css` HSL variables — they automatically swap in light/dark mode.
// ============================================================================

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Save, BookOpen, Zap, ArrowLeftRight, Cpu, Info, History,
  Radio, Waves, Gauge, Power, Play, Square as StopIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { COMPONENTS, type ComponentKey } from "@/data/components";
import { GENERATORS, GENERATOR_ORDER, type GeneratorKey } from "@/data/generators";
import { useBleFeed } from "@/hooks/use-ble-feed";

// ─── Type aliases for the two top-level modes and the READ sub-modes ─────────
type TopMode = "read" | "generate";
type ReadSub = "component" | "frequency" | "voltage";

// Static config for the three READ sub-mode chips (label + icon).
const READ_SUBS: { key: ReadSub; label: string; icon: typeof Radio }[] = [
  { key: "component", label: "Component", icon: Cpu },
  { key: "frequency", label: "Frequency", icon: Waves },
  { key: "voltage",   label: "Voltage",   icon: Gauge },
];

const Dashboard = () => {
  const navigate = useNavigate();

  // Local UI state — which top tab + which sub-mode is selected.
  const [topMode, setTopMode] = useState<TopMode>("read");
  const [readSub, setReadSub] = useState<ReadSub>("component");
  const [genKey, setGenKey]   = useState<GeneratorKey>("psu");

  // Mocked BLE telemetry stream. We pause it while the user is in GENERATE
  // mode because the hardware would be busy outputting, not measuring.
  const ble = useBleFeed({ paused: topMode === "generate" });

  return (
    // px-4    → 16px horizontal padding so content never touches the edge
    // pt-6    → 24px top padding (breathing room under status bar)
    // pb-6    → 24px bottom padding (clears the BottomNav)
    // max-w-screen-md → caps width at 768px on tablet / desktop
    // mx-auto → centers horizontally when the viewport is wider than max-w
    <div className="px-4 pt-6 pb-6 max-w-screen-md mx-auto">

      {/* ───────── STATUS BAR ───────── */}
      {/* mb-4              → 16px gap below this row
          flex              → horizontal flex container
          items-center      → vertically centers status dot + text
          justify-between   → pushes left group and right group apart */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mb-4 flex items-center justify-between"
      >
        {/* Left group: pulsing status dot + label */}
        {/* gap-2 → 8px between dot and label */}
        <div className="flex items-center gap-2">
          {/* h-2 w-2          → 8x8px square
              rounded-full     → makes it a circle
              bg-inductor      → green token when measuring
              bg-voltage       → yellow token when generating
              animate-pulse-dot → custom keyframe defined in index.css */}
          <div className={`h-2 w-2 rounded-full ${topMode === "read" ? "bg-inductor" : "bg-voltage"} animate-pulse-dot`} />
          {/* text-xs              → 12px font
              font-medium          → 500 weight
              text-muted-foreground → low-contrast token (grey) */}
          <span className="text-xs font-medium text-muted-foreground">
            {topMode === "read" ? "Measuring" : "Generating"}
          </span>
        </div>

        {/* Right group: test frequency + battery indicator */}
        {/* gap-3 → 12px between freq text and battery */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{ble.testFrequency}</span>
          <div className="flex items-center gap-1">
            {/* Battery shell:
                h-1.5 w-3        → 6x12px tiny rectangle
                rounded-sm       → 2px corners
                border           → 1px outline
                relative         → positioning context for the fill bar */}
            <div className="h-1.5 w-3 rounded-sm border border-muted-foreground relative">
              {/* Battery fill:
                  absolute inset-0.5 → 2px inset on all sides
                  bg-inductor        → green fill
                  rounded-[1px]      → arbitrary 1px corner */}
              <div className="absolute inset-0.5 bg-inductor rounded-[1px]" style={{ width: `${ble.battery}%` }} />
            </div>
            <span>{ble.battery}%</span>
          </div>
        </div>
      </motion.div>

      {/* ───────── TOP TOGGLE: READ ↔ GENERATE ───────── */}
      {/* mb-4               → 16px gap below
          grid grid-cols-2   → 2 equal-width columns
          gap-1              → 4px between the two buttons
          rounded-2xl        → 16px rounded outer container
          border border-border → themed 1px border
          bg-card            → card background token (slightly lighter than page)
          p-1                → 4px inner padding so buttons sit inside */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
        {(["read", "generate"] as TopMode[]).map((m) => {
          const active = topMode === m;
          const Icon = m === "read" ? Radio : Power;
          return (
            <button
              key={m}
              onClick={() => setTopMode(m)}
              // flex items-center justify-center → centers icon + label
              // gap-2          → 8px between icon and text
              // rounded-xl     → 12px corners (slightly smaller than parent)
              // py-2.5         → 10px vertical padding
              // text-sm        → 14px
              // font-semibold  → 600 weight
              // transition-all → smooth color/shadow change
              // ACTIVE branches:
              //   bg-primary text-primary-foreground shadow-md  → blue pill
              //   bg-voltage text-background shadow-md          → yellow pill
              // INACTIVE: muted text that brightens on hover
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                active
                  ? m === "read"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-voltage text-background shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {/* h-4 w-4 → 16x16px icon */}
              <Icon className="h-4 w-4" />
              {m === "read" ? "READ" : "GENERATE"}
            </button>
          );
        })}
      </div>

      {/* ───────── SUB-MODE CHIPS ───────── */}
      {/* flex gap-1.5 → row with 6px gaps; each child uses flex-1 to share width */}
      {topMode === "read" ? (
        <div className="mb-4 flex gap-1.5">
          {READ_SUBS.map(({ key, label, icon: Icon }) => {
            const active = readSub === key;
            return (
              <button
                key={key}
                onClick={() => setReadSub(key)}
                // flex-1     → grow to share row equally
                // px-3 py-2  → 12px horiz / 8px vert padding
                // text-xs    → 12px
                // ACTIVE: tinted border + 10% primary background + primary text
                // INACTIVE: neutral card with hover swap to secondary
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {/* h-3.5 w-3.5 → 14x14px icon */}
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        // Generator chips — same layout, but the active color comes from the
        // generator's own semantic token (g.color / g.bgColor).
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

      {/* ───────── CONTENT ─────────
          AnimatePresence + motion.div → fade/slide swap when sub-mode changes.
          We render exactly one of four views below. */}
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
        // mt-4 → 16px above
        // grid grid-cols-2 gap-2 → 2 columns, 8px gaps → Save/Learn/Compare/History
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 grid grid-cols-2 gap-2"
        >
          {[
            { label: "Save",     icon: Save,           path: null,           accent: false },
            { label: "Learn",    icon: BookOpen,       path: `/learn/${COMPONENTS[ble.detected === "auto" ? "capacitor" : ble.detected]?.slug ?? ""}`, accent: true },
            { label: "Compare",  icon: ArrowLeftRight, path: "/comparison",  accent: false },
            { label: "History",  icon: History,        path: "/history",     accent: false },
          ].map(({ label, icon: Icon, path, accent }) => (
            <button
              key={label}
              onClick={() => path && navigate(path)}
              // px-4 py-3        → 16px / 12px padding (comfy tap target)
              // active:scale-[0.97] → squish on press for tactile feel
              // accent variant   → primary-tinted (used for "Learn")
              // default variant  → neutral card
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${
                accent
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {/* truncate → ellipsis if label is too long for the column */}
              <span className="truncate">{label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ============================================================================
// READ → COMPONENT (auto-detected component view)
// ============================================================================
const ReadComponentView = ({
  ble, navigate,
}: { ble: ReturnType<typeof useBleFeed>; navigate: ReturnType<typeof useNavigate> }) => {
  // Fall back to "capacitor" when BLE hasn't reported yet (avoids empty UI).
  const detectedKey: Exclude<ComponentKey, "auto"> =
    ble.detected === "auto" ? "capacitor" : ble.detected;
  const comp = COMPONENTS[detectedKey];

  // Merge live BLE values into the static parameter spec so that whatever the
  // hardware most recently reported overrides the placeholder default.
  const params = useMemo(
    () => comp.parameters.map((p) => ({ ...p, value: ble.values[p.key] ?? p.value })),
    [comp, ble.values],
  );
  const headline = params.find((p) => p.key === comp.primaryKey) ?? params[0];

  return (
    <>
      {/* ── Detected badge (pill) ──
          mb-3              → 12px gap below
          inline-flex       → shrink-to-fit pill (not full width)
          items-center      → vertical center icon + text
          gap-2             → 8px between icon and text
          rounded-full      → fully circular ends (pill shape)
          border            → 1px outline, color from comp.borderColor
          px-3 py-1.5       → 12px horiz / 6px vert padding
          comp.bgColor / comp.color / comp.borderColor → swap per detected type
                              (e.g. orange for resistor, blue for capacitor) */}
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${comp.bgColor} ${comp.borderColor}`}>
        <Zap className={`h-3.5 w-3.5 ${comp.color}`} />
        <span className={`text-xs font-semibold ${comp.color}`}>
          Detected: {comp.type}
        </span>
        {ble.pinOrder && (
          // text-[10px]    → arbitrary 10px (smaller than text-xs=12px)
          // font-mono      → JetBrains Mono (used for all numeric data)
          <span className="text-[10px] font-mono text-muted-foreground">· pins {ble.pinOrder}</span>
        )}
      </div>

      {/* ── Headline measurement card ──
          rounded-2xl border border-border bg-card → standard card chrome
          p-6        → 24px padding for a roomy hero look
          card-glow  → custom utility (subtle shadow + inner border highlight)
          text-center → center the giant number */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-6 card-glow text-center">
        {/* tracking-widest → wider letter-spacing for the small UPPER label */}
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          {comp.primaryLabel}
        </p>
        {/* items-baseline → aligns the number and the unit on the same baseline
            (so the small "Hz" doesn't float above the big number) */}
        <div className="flex items-baseline justify-center gap-2">
          <motion.span
            key={headline.value + headline.unit}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            // font-mono       → numeric font (JetBrains Mono)
            // text-6xl        → 60px display size
            // font-bold       → 700 weight
            // comp.color      → semantic color per component
            // comp.glow       → text-shadow glow utility per component
            // tracking-tight  → -0.025em letter-spacing for big numerals
            className={`font-mono text-6xl font-bold ${comp.color} ${comp.glow} tracking-tight`}
          >
            {headline.value}
          </motion.span>
          {headline.unit && (
            // text-2xl → 24px unit label (smaller than the value)
            <span className="text-2xl font-medium text-muted-foreground">{headline.unit}</span>
          )}
        </div>
        {/* "Live" indicator below the value */}
        <div className="mt-4 flex items-center justify-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-inductor animate-pulse-dot" />
          <span className="text-xs text-inductor font-medium">Live</span>
        </div>
      </div>

      {/* ── All Parameters grid ──
          grid-cols-2 → 2 columns of small parameter cards
          gap-2       → 8px gap */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            All Parameters
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {params.map((p) => (
            // Each parameter card: same chrome as headline but tighter padding (p-3=12px)
            <div key={p.key} className="rounded-xl border border-border bg-card p-3 card-glow">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {p.label}
                </span>
                {p.unit && (
                  // /70 = 70% opacity on the muted-foreground color
                  <span className="text-[10px] font-mono text-muted-foreground/70">{p.unit}</span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`font-mono text-xl font-semibold ${comp.color}`}>{p.value}</span>
                {p.unit && <span className="text-xs text-muted-foreground">{p.unit}</span>}
              </div>
              {/* leading-snug → 1.375 line-height, tighter than default */}
              <p className="mt-1.5 text-[10px] text-muted-foreground/80 leading-snug">
                <span className="font-medium">Range:</span> {p.range}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pin layout card ──
          Renders only when the component defines a pin layout (BJT, MOSFET, …) */}
      {comp.pinLayout && (
        <div className="mb-4 rounded-xl border border-border bg-card p-3 card-glow">
          <div className="flex items-center gap-1.5 mb-3">
            <Cpu className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Pin Layout
            </p>
          </div>
          {/* Row of pin circles, gap-4 = 16px between each */}
          <div className="flex items-center justify-center gap-4 py-2">
            {comp.pinLayout.pins.map((pin, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                {/* h-10 w-10        → 40x40px circle
                    border-2         → 2px outline (thicker than default)
                    border + bg take their color from the component's tokens */}
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${comp.borderColor} ${comp.bgColor}`}>
                  <span className={`font-mono text-sm font-bold ${comp.color}`}>{pin}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Pin {idx + 1}</span>
              </div>
            ))}
          </div>
          {comp.pinLayout.note && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground/80">{comp.pinLayout.note}</p>
          )}
        </div>
      )}

      {/* ── Detections card ──
          Lists side-effects the hardware can flag (e.g. "Body Diode OK").
          Each row dims when inactive and lights up green when detected. */}
      {comp.flags && comp.flags.length > 0 && (
        <div className="mb-2 rounded-xl border border-border bg-card p-3 card-glow">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Detections
            </p>
          </div>
          {/* space-y-1.5 → 6px vertical gap between list items */}
          <ul className="space-y-1.5">
            {comp.flags.map((f) => {
              const isActive = ble.activeFlags.includes(f.label) || f.active;
              return (
                <li key={f.label} className="flex items-center gap-2 text-xs">
                  {/* shrink-0 prevents the dot from squishing when text wraps */}
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? "bg-inductor" : "bg-muted-foreground/30"}`} />
                  <span className={isActive ? "text-foreground" : "text-muted-foreground/60"}>{f.label}</span>
                  {isActive && (
                    // ml-auto → push "Detected" tag to the right edge of the row
                    <span className="ml-auto text-[10px] font-semibold uppercase text-inductor">Detected</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
};

// ============================================================================
// READ → FREQUENCY / VOLTAGE — single big-number view
// ============================================================================
const SingleValueView = ({
  label, value, unit, colorClass, glow, note,
}: { label: string; value: string; unit: string; colorClass: string; glow: string; note: string }) => (
  // p-8 → 32px padding (extra roomy because there's only one number)
  <div className="rounded-2xl border border-border bg-card p-8 card-glow text-center">
    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">{label}</p>
    <div className="flex items-baseline justify-center gap-2">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        // text-7xl → 72px (one step bigger than headline because this is the only number on the page)
        className={`font-mono text-7xl font-bold tracking-tight ${colorClass} ${glow}`}
      >
        {value}
      </motion.span>
      <span className="text-3xl font-medium text-muted-foreground">{unit}</span>
    </div>
    <div className="mt-4 flex items-center justify-center gap-1">
      <div className="h-1.5 w-1.5 rounded-full bg-inductor animate-pulse-dot" />
      <span className="text-xs text-inductor font-medium">Live</span>
    </div>
    {/* /70 = 70% opacity for tertiary helper text */}
    <p className="mt-4 text-[11px] text-muted-foreground/70">{note}</p>
  </div>
);

// ============================================================================
// GENERATE — DC PSU / Func Gen / PWM
// ============================================================================
const GenerateView = ({ genKey }: { genKey: GeneratorKey }) => {
  const g = GENERATORS[genKey];

  // Each control is keyed by `<genKey>:<controlKey>` so values persist when
  // the user flips between PSU/FuncGen/PWM without losing settings.
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    GENERATOR_ORDER.forEach((k) =>
      GENERATORS[k].controls.forEach((c) => { init[`${k}:${c.key}`] = c.default; }),
    );
    return init;
  });
  const [waveform, setWaveform] = useState<string>(g.waveforms?.[0] ?? "Sine");
  const [running,  setRunning]  = useState(false);

  const set = (ck: string, v: number) =>
    setValues((p) => ({ ...p, [`${genKey}:${ck}`]: v }));

  return (
    // space-y-3 → 12px vertical gap between every direct child (no manual mb-* needed)
    <div className="space-y-3">

      {/* ── Header / status ──
          Border + bg take the generator's own tint (yellow/cyan/etc).
          p-4 → 16px padding. */}
      <div className={`rounded-2xl border ${g.borderColor} ${g.bgColor} p-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${g.color}`}>{g.type}</p>
            {/* mt-0.5 → 2px gap between title and description */}
            <p className="text-[11px] text-muted-foreground mt-0.5">{g.description}</p>
          </div>
          {/* ON/OFF pill:
              px-2 py-0.5  → tight pill padding (8px / 2px)
              rounded-full → fully rounded ends
              ON: green-tinted background + green text
              OFF: muted background + muted text */}
          <div className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            running ? "bg-inductor/20 text-inductor" : "bg-muted text-muted-foreground"
          }`}>
            {running ? "● ON" : "○ OFF"}
          </div>
        </div>
      </div>

      {/* ── Waveform picker (Func Gen only) ──
          grid grid-cols-3 → 3 equal columns (Sine / Square / Triangle …) */}
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
                // py-2 → 8px vertical padding
                // ACTIVE: tinted using current generator's color (border-current)
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

      {/* ── Controls — one card per parameter (voltage, current limit, freq …) ── */}
      {g.controls.map((c) => {
        const v = values[`${genKey}:${c.key}`];
        return (
          <div key={c.key} className="rounded-xl border border-border bg-card p-3 card-glow">
            {/* Top row: label on left, current value on right */}
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span className={`font-mono text-lg font-bold ${g.color}`}>
                {v.toLocaleString()} <span className="text-xs text-muted-foreground">{c.unit}</span>
              </span>
            </div>
            {/* Native range slider:
                w-full         → fills card width
                accent-primary → tints the thumb+track using --primary */}
            <input
              type="range"
              min={c.min} max={c.max} step={c.step} value={v}
              onChange={(e) => set(c.key, +e.target.value)}
              className="w-full accent-primary"
            />
            {/* Bottom row: min on the left, description in middle, max on the right */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] font-mono text-muted-foreground/60">{c.min}{c.unit}</span>
              <p className="text-[10px] text-muted-foreground/80">{c.description}</p>
              <span className="text-[9px] font-mono text-muted-foreground/60">{c.max}{c.unit}</span>
            </div>
          </div>
        );
      })}

      {/* ── START / STOP big button ──
          w-full     → spans full width
          py-4       → 16px vertical padding (large tap target)
          text-base  → 16px
          font-bold  → emphasizes the call-to-action
          active:scale-[0.98] → press feedback
          STOP variant: solid destructive (red) background
          START variant: tinted with generator color + 2px border */}
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

      {/* Footnote — /60 = very faint helper text */}
      <p className="text-center text-[10px] text-muted-foreground/60">
        Hardware will receive these parameters via BLE when you press START.
      </p>
    </div>
  );
};

export default Dashboard;
