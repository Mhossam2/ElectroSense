import { useState, useRef, useCallback, useMemo, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Grid3X3, ZoomIn, ZoomOut, Trash2, Save, MousePointer, Minus,
  RotateCw, X, Check, Undo2, Play, Copy, Layers, Eraser, CircleDot, Hand,
  Move as MoveIcon, Search, Pause, Bluetooth, BluetoothOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  circuitStore, useCircuitStore,
  type PlacedComponent, type Pin, type Wire,
} from "@/hooks/use-circuit-store";
import { useBleFeed } from "@/hooks/use-ble-feed";
import type { BleReadPayload, ParsedPinOrder } from "@/hooks/use-ble-feed";
import { findBestMatch, formatSI, type MatchResult } from "@/lib/match-measurement";

// ─── Constants ───────────────────────────────────────────────
// Both must be multiples of GRID so component centers (and therefore pins)
// land exactly on snap dots — otherwise pins drift away from the body.
const COMP_W = 80;
const COMP_H = 40;
const PIN_SNAP_RADIUS = 12;  // how close the cursor must be to a pin to snap to it when starting a wire
const GRID = 20;
// Pin offsets are multiples of GRID so pins always sit on a snap dot.
const PIN_OUT = GRID * 2;        // 40 — distance from comp center to L/R pin (pin sits exactly on comp edge)
const PIN_OUT_V = GRID;          // 20 — distance from comp center to T/B pin (pin sits exactly on comp edge)
const MAX_PAN = 4000;            // hard pan limit so user can't run away

const componentParts = [
  { name: "R", label: "Resistor", color: "bg-resistor", textColor: "text-resistor", defaultValue: "10kΩ" },
  { name: "C", label: "Capacitor", color: "bg-capacitor", textColor: "text-capacitor", defaultValue: "100nF" },
  { name: "L", label: "Inductor", color: "bg-inductor", textColor: "text-inductor", defaultValue: "10µH" },
  { name: "D", label: "Diode", color: "bg-diode", textColor: "text-diode", defaultValue: "1N4148" },
  { name: "Q", label: "BJT", color: "bg-bjt", textColor: "text-bjt", defaultValue: "2N2222" },
  { name: "M", label: "MOSFET", color: "bg-mosfet", textColor: "text-mosfet", defaultValue: "IRF540" },
  { name: "GND", label: "Ground", color: "bg-muted-foreground", textColor: "text-muted-foreground", defaultValue: "" },
  { name: "V+", label: "VCC", color: "bg-diode", textColor: "text-diode", defaultValue: "5V" },
  { name: "J", label: "Junction", color: "bg-primary", textColor: "text-primary", defaultValue: "" },
];

type Tool = "move" | "pan" | "wire" | "delete" | "rotate";

// New shortcut map per spec:
//   M = move, P = pan, W = wire, R = resistor, C = capacitor, L = inductor,
//   V = vcc, G = ground, D = diode, B = bjt, T = mosfet, J = junction,
//   Ctrl+R = rotate, Del/Backspace = delete tool / delete selection.
const toolDefs: { id: Tool; icon: any; label: string; shortcut: string }[] = [
  { id: "move", icon: MousePointer, label: "Move", shortcut: "M" },
  { id: "pan", icon: Hand, label: "Pan", shortcut: "P" },
  { id: "wire", icon: Minus, label: "Wire", shortcut: "W" },
  { id: "rotate", icon: RotateCw, label: "Rotate", shortcut: "⌃R" },
  { id: "delete", icon: Trash2, label: "Delete", shortcut: "Del" },
];

const ADD_SHORTCUTS: Record<string, string> = {
  r: "R", c: "C", l: "L", v: "V+", g: "GND", d: "D", b: "Q", t: "M", j: "J",
};

let idCounter = Date.now();
const genId = () => `comp-${++idCounter}`;
const wireGenId = () => `wire-${++idCounter}`;

// ─── Helpers ─────────────────────────────────────────────────
// Pin layouts use multiples of GRID so every pin lands on a snap dot.
const PIN_LAYOUTS: Record<string, { side: Pin["side"]; dx: number; dy: number }[]> = {
  R:  [{ side: "left", dx: -PIN_OUT, dy: 0 }, { side: "right", dx: PIN_OUT, dy: 0 }],
  C:  [{ side: "left", dx: -PIN_OUT, dy: 0 }, { side: "right", dx: PIN_OUT, dy: 0 }],
  L:  [{ side: "left", dx: -PIN_OUT, dy: 0 }, { side: "right", dx: PIN_OUT, dy: 0 }],
  D:  [{ side: "left", dx: -PIN_OUT, dy: 0 }, { side: "right", dx: PIN_OUT, dy: 0 }],
  Q:  [
    { side: "left", dx: -PIN_OUT, dy: 0 },
    { side: "top", dx: 0, dy: -PIN_OUT_V },
    { side: "bottom", dx: 0, dy: PIN_OUT_V },
  ],
  M:  [
    { side: "left", dx: -PIN_OUT, dy: 0 },
    { side: "top", dx: 0, dy: -PIN_OUT_V },
    { side: "bottom", dx: 0, dy: PIN_OUT_V },
  ],
  GND: [{ side: "top", dx: 0, dy: -PIN_OUT_V }],
  "V+": [{ side: "bottom", dx: 0, dy: PIN_OUT_V }],
  J:  [
    { side: "left", dx: -PIN_OUT, dy: 0 },
    { side: "right", dx: PIN_OUT, dy: 0 },
    { side: "top", dx: 0, dy: -PIN_OUT_V },
    { side: "bottom", dx: 0, dy: PIN_OUT_V },
  ],
};

const PIN_LABELS: Record<string, Record<string, string>> = {
  R: { left: "1", right: "2" },
  C: { left: "+", right: "−" },
  L: { left: "1", right: "2" },
  D: { left: "A", right: "K" },
  Q: { left: "B", top: "C", bottom: "E" },
  M: { left: "G", top: "D", bottom: "S" },
  GND: {}, "V+": {}, J: {},
};

const getPinLabel = (t: string, s: string) => PIN_LABELS[t]?.[s] || "";

const getPinLabelOffset = (side: string) => {
  switch (side) {
    case "left": return { dx: -10, dy: 1, anchor: "end" };
    case "right": return { dx: 10, dy: 1, anchor: "start" };
    case "top": return { dx: 0, dy: -8, anchor: "middle" };
    case "bottom": return { dx: 0, dy: 12, anchor: "middle" };
    default: return { dx: 0, dy: 0, anchor: "middle" };
  }
};

function getCompPins(comp: PlacedComponent): Pin[] {
  const cx = comp.x + COMP_W / 2;
  const cy = comp.y + COMP_H / 2;
  const offsets = PIN_LAYOUTS[comp.type] || PIN_LAYOUTS.J;
  const rad = (comp.rotation * Math.PI) / 180;
  return offsets.map(p => {
    const rx = p.dx * Math.cos(rad) - p.dy * Math.sin(rad);
    const ry = p.dx * Math.sin(rad) + p.dy * Math.cos(rad);
    // snap to grid so pins always land on dots even after rotation
    return {
      compId: comp.id,
      side: p.side,
      x: Math.round((cx + rx) / GRID) * GRID,
      y: Math.round((cy + ry) / GRID) * GRID,
    };
  });
}

function routeWire(p1: { x: number; y: number }, p2: { x: number; y: number }): { x: number; y: number }[] {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);
  if (dx < 4 || dy < 4) return [p1, p2];
  if (dx >= dy) {
    const midX = Math.round((p1.x + p2.x) / 2 / GRID) * GRID;
    return [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
  }
  const midY = Math.round((p1.y + p2.y) / 2 / GRID) * GRID;
  return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
}

function closestPointOnSegment(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return { x, y, dist: Math.hypot(x - px, y - py) };
}

const WIRE_SNAP_RADIUS = 14;
function findNearestWirePoint(wires: Wire[], x: number, y: number) {
  let best: { x: number; y: number; wireId: string } | null = null;
  let bestDist = WIRE_SNAP_RADIUS;
  for (const w of wires) {
    for (let i = 0; i < w.points.length - 1; i++) {
      const a = w.points[i], b = w.points[i + 1];
      const r = closestPointOnSegment(a.x, a.y, b.x, b.y, x, y);
      if (r.dist < bestDist) {
        bestDist = r.dist;
        // SNAP the resulting point to the grid — wires can only start/end on
        // snap dots, even when latching onto an existing wire.
        best = {
          x: Math.round(r.x / GRID) * GRID,
          y: Math.round(r.y / GRID) * GRID,
          wireId: w.id,
        };
      }
    }
  }
  return best;
}

// ─── SVG Component Symbols ──────────────────────────────────
// Small symbol used in the parts library / chips (24×24 icon).
function ComponentSymbolImpl({ type, color }: { type: string; color: string }) {
  const strokeColor = `hsl(var(--${color.replace("text-", "")}))`;
  const size = 24;
  switch (type) {
    case "R": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M2 12h3l1.5-5 3 10 3-10 3 10 1.5-5h3" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "C": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><line x1="2" y1="12" x2="9" y2="12" stroke={strokeColor} strokeWidth="1.8" /><line x1="9" y1="5" x2="9" y2="19" stroke={strokeColor} strokeWidth="2.2" /><line x1="15" y1="5" x2="15" y2="19" stroke={strokeColor} strokeWidth="2.2" /><line x1="15" y1="12" x2="22" y2="12" stroke={strokeColor} strokeWidth="1.8" /></svg>;
    case "L": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M2 12h2c0 0 0-4 2.5-4s2.5 4 2.5 4c0 0 0-4 2.5-4s2.5 4 2.5 4c0 0 0-4 2.5-4S19 12 19 12h3" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "D": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><line x1="2" y1="12" x2="8" y2="12" stroke={strokeColor} strokeWidth="1.8" /><polygon points="8,6 16,12 8,18" fill={strokeColor} opacity="0.3" stroke={strokeColor} strokeWidth="1.5" /><line x1="16" y1="6" x2="16" y2="18" stroke={strokeColor} strokeWidth="2" /><line x1="16" y1="12" x2="22" y2="12" stroke={strokeColor} strokeWidth="1.8" /></svg>;
    case "Q": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><line x1="2" y1="12" x2="8" y2="12" stroke={strokeColor} strokeWidth="1.8" /><line x1="8" y1="5" x2="8" y2="19" stroke={strokeColor} strokeWidth="2" /><line x1="8" y1="8" x2="18" y2="4" stroke={strokeColor} strokeWidth="1.8" /><line x1="8" y1="16" x2="18" y2="20" stroke={strokeColor} strokeWidth="1.8" /><polygon points="15,19 18,20 16,17" fill={strokeColor} /></svg>;
    case "M": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><line x1="2" y1="12" x2="7" y2="12" stroke={strokeColor} strokeWidth="1.8" /><line x1="7" y1="5" x2="7" y2="19" stroke={strokeColor} strokeWidth="2" /><line x1="10" y1="5" x2="10" y2="9" stroke={strokeColor} strokeWidth="1.8" /><line x1="10" y1="11" x2="10" y2="13" stroke={strokeColor} strokeWidth="1.8" /><line x1="10" y1="15" x2="10" y2="19" stroke={strokeColor} strokeWidth="1.8" /><line x1="10" y1="7" x2="20" y2="7" stroke={strokeColor} strokeWidth="1.5" /><line x1="10" y1="17" x2="20" y2="17" stroke={strokeColor} strokeWidth="1.5" /><line x1="10" y1="12" x2="20" y2="12" stroke={strokeColor} strokeWidth="1.5" /><line x1="20" y1="7" x2="20" y2="12" stroke={strokeColor} strokeWidth="1.5" /></svg>;
    case "GND": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><line x1="12" y1="2" x2="12" y2="10" stroke={strokeColor} strokeWidth="1.8" /><line x1="4" y1="10" x2="20" y2="10" stroke={strokeColor} strokeWidth="2" /><line x1="7" y1="14" x2="17" y2="14" stroke={strokeColor} strokeWidth="1.8" /><line x1="10" y1="18" x2="14" y2="18" stroke={strokeColor} strokeWidth="1.5" /></svg>;
    case "V+": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><line x1="12" y1="22" x2="12" y2="10" stroke={strokeColor} strokeWidth="1.8" /><polygon points="12,4 8,10 16,10" fill={strokeColor} opacity="0.4" stroke={strokeColor} strokeWidth="1.5" /></svg>;
    case "J": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill={strokeColor} opacity="0.6" stroke={strokeColor} strokeWidth="1.5" /></svg>;
    default: return <span className={`font-mono text-sm font-bold ${color}`}>{type}</span>;
  }
}

const ComponentSymbol = forwardRef<HTMLSpanElement, { type: string; color: string }>(
  (props, ref) => <span ref={ref} className="inline-flex"><ComponentSymbolImpl {...props} /></span>
);
ComponentSymbol.displayName = "ComponentSymbol";

// ─── Full-size schematic body ────────────────────────────────
// Renders a real-looking schematic symbol that fills the COMP_W × COMP_H
// box. Leads extend from the body all the way to the pin positions so the
// drawing visually "connects" to the snap dots / wires.
//
// Local coordinate system: viewBox `0 0 COMP_W COMP_H` (i.e. 0..80 × 0..40).
// Center is (40, 20). Horizontal pins sit at x=0 / x=80 (y=20). Vertical
// pins (Q, M, GND, V+) sit at y=0 / y=40 (x=40).
function SchematicBody({ type, color, accent }: { type: string; color: string; accent: string }) {
  // accent = stroke color used for the body glyph (component family color)
  // color  = stroke color used for the leads (so they look like wires:
  //          we use the muted-foreground tone to match the wire rendering).
  const lead = "hsl(var(--foreground))";
  const w = COMP_W, h = COMP_H;
  const cx = w / 2, cy = h / 2;
  const sw = 1.6;          // body stroke width
  const lw = 1.8;          // lead stroke width

  // Helper: a straight lead from (x1,y1) to (x2,y2)
  const Lead = (p: { x1: number; y1: number; x2: number; y2: number }) => (
    <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={lead} strokeWidth={lw} strokeLinecap="round" />
  );

  switch (type) {
    case "R": {
      // Resistor: zigzag between x=26 and x=54, leads extend to both sides.
      const zig = "M26,20 L29,12 L33,28 L37,12 L41,28 L45,12 L49,28 L53,12 L54,20";
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <Lead x1={0} y1={cy} x2={26} y2={cy} />
          <Lead x1={54} y1={cy} x2={w} y2={cy} />
          <path d={zig} stroke={accent} strokeWidth={sw + 0.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    case "C": {
      // Capacitor: two parallel plates at x=36 and x=44.
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <Lead x1={0} y1={cy} x2={36} y2={cy} />
          <Lead x1={44} y1={cy} x2={w} y2={cy} />
          <line x1={36} y1={8} x2={36} y2={32} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          <line x1={44} y1={8} x2={44} y2={32} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      );
    }
    case "L": {
      // Inductor: 4 half-circle bumps from x=24..56.
      const d = "M24,20 A4,4 0 0,1 32,20 A4,4 0 0,1 40,20 A4,4 0 0,1 48,20 A4,4 0 0,1 56,20";
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <Lead x1={0} y1={cy} x2={24} y2={cy} />
          <Lead x1={56} y1={cy} x2={w} y2={cy} />
          <path d={d} stroke={accent} strokeWidth={sw + 0.2} fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    case "D": {
      // Diode: triangle + cathode bar, anode on left.
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <Lead x1={0} y1={cy} x2={32} y2={cy} />
          <Lead x1={48} y1={cy} x2={w} y2={cy} />
          <polygon points={`32,10 32,30 48,20`} fill={accent} fillOpacity={0.25} stroke={accent} strokeWidth={sw} strokeLinejoin="round" />
          <line x1={48} y1={10} x2={48} y2={30} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      );
    }
    case "Q": {
      // BJT (NPN): circle with base on left, collector top, emitter bottom.
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          {/* leads */}
          <Lead x1={0} y1={cy} x2={28} y2={cy} />     {/* base lead */}
          <Lead x1={cx} y1={0} x2={cx} y2={8} />      {/* collector lead */}
          <Lead x1={cx} y1={32} x2={cx} y2={h} />     {/* emitter lead */}
          {/* envelope circle */}
          <circle cx={cx} cy={cy} r={14} fill="none" stroke={accent} strokeWidth={sw} opacity={0.65} />
          {/* base bar */}
          <line x1={28} y1={12} x2={28} y2={28} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          {/* collector / emitter slants */}
          <line x1={28} y1={16} x2={cx} y2={8} stroke={accent} strokeWidth={sw} strokeLinecap="round" />
          <line x1={28} y1={24} x2={cx} y2={32} stroke={accent} strokeWidth={sw} strokeLinecap="round" />
          {/* emitter arrow */}
          <polygon points={`${cx - 2},29 ${cx + 2},33 ${cx - 4},33`} fill={accent} />
        </svg>
      );
    }
    case "M": {
      // MOSFET (n-ch, enh): gate on left, drain top, source bottom.
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <Lead x1={0} y1={cy} x2={26} y2={cy} />
          <Lead x1={cx} y1={0} x2={cx} y2={8} />
          <Lead x1={cx} y1={32} x2={cx} y2={h} />
          {/* gate vertical bar (offset from channel) */}
          <line x1={30} y1={12} x2={30} y2={28} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          {/* channel: 3 short segments (enhancement-mode dashed-look) */}
          <line x1={34} y1={12} x2={34} y2={16} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          <line x1={34} y1={18} x2={34} y2={22} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          <line x1={34} y1={24} x2={34} y2={28} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          {/* drain / source horizontals */}
          <line x1={34} y1={14} x2={cx} y2={14} stroke={accent} strokeWidth={sw} strokeLinecap="round" />
          <line x1={cx} y1={14} x2={cx} y2={8} stroke={accent} strokeWidth={sw} strokeLinecap="round" />
          <line x1={34} y1={26} x2={cx} y2={26} stroke={accent} strokeWidth={sw} strokeLinecap="round" />
          <line x1={cx} y1={26} x2={cx} y2={32} stroke={accent} strokeWidth={sw} strokeLinecap="round" />
          {/* arrow on source */}
          <polygon points={`${cx - 3},23 ${cx + 1},26 ${cx - 3},29`} fill={accent} />
        </svg>
      );
    }
    case "GND": {
      // Ground: vertical lead from top-pin (y=0) down to ladder.
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <Lead x1={cx} y1={0} x2={cx} y2={18} />
          <line x1={cx - 14} y1={20} x2={cx + 14} y2={20} stroke={accent} strokeWidth={2.6} strokeLinecap="round" />
          <line x1={cx - 9}  y1={26} x2={cx + 9}  y2={26} stroke={accent} strokeWidth={2.2} strokeLinecap="round" />
          <line x1={cx - 5}  y1={32} x2={cx + 5}  y2={32} stroke={accent} strokeWidth={2.0} strokeLinecap="round" />
        </svg>
      );
    }
    case "V+": {
      // VCC: arrow up from body to a small tip; lead extends down to bottom pin.
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <Lead x1={cx} y1={20} x2={cx} y2={h} />
          <line x1={cx} y1={6} x2={cx} y2={20} stroke={accent} strokeWidth={2.2} strokeLinecap="round" />
          <polygon points={`${cx},2 ${cx - 5},10 ${cx + 5},10`} fill={accent} stroke={accent} strokeWidth={1.2} strokeLinejoin="round" />
        </svg>
      );
    }
    case "J": {
      // Junction: small filled dot at the center; four small stubs out to each
      // pin so it visually anchors to whatever wire(s) latch onto it.
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
          <Lead x1={0} y1={cy} x2={w} y2={cy} />
          <Lead x1={cx} y1={0} x2={cx} y2={h} />
          <circle cx={cx} cy={cy} r={4.5} fill={accent} />
        </svg>
      );
    }
    default:
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fontFamily="monospace" fill={accent}>{type}</text>
        </svg>
      );
  }
}

const clampPan = (v: number) => Math.max(-MAX_PAN, Math.min(MAX_PAN, v));

// ─── Main Component ──────────────────────────────────────────
const CircuitBuilder = () => {
  const navigate = useNavigate();
  const stored = useCircuitStore();
  const components = stored.components;
  const wires = stored.wires;
  const junctions = stored.junctions;
  const zoom = stored.zoom;
  const panOffset = stored.panOffset;

  const setComponents = (updater: PlacedComponent[] | ((p: PlacedComponent[]) => PlacedComponent[])) =>
    circuitStore.set((s) => ({ components: typeof updater === "function" ? updater(s.components) : updater }));
  const setWires = (updater: Wire[] | ((p: Wire[]) => Wire[])) =>
    circuitStore.set((s) => ({ wires: typeof updater === "function" ? updater(s.wires) : updater }));
  const setJunctions = (updater: { x: number; y: number }[] | ((p: { x: number; y: number }[]) => { x: number; y: number }[])) =>
    circuitStore.set((s) => ({ junctions: typeof updater === "function" ? updater(s.junctions) : updater }));
  const setZoom = (updater: number | ((p: number) => number)) =>
    circuitStore.set((s) => ({ zoom: typeof updater === "function" ? updater(s.zoom) : updater }));
  const setPanOffset = (updater: { x: number; y: number } | ((p: { x: number; y: number }) => { x: number; y: number })) =>
    circuitStore.set((s) => ({ panOffset: typeof updater === "function" ? updater(s.panOffset) : updater }));

  const [activeTool, setActiveTool] = useState<Tool>("move");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedWireIds, setSelectedWireIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [groupDragStart, setGroupDragStart] = useState<{ ax: number; ay: number; positions: Map<string, { x: number; y: number }> } | null>(null);
  const [wireStartPin, setWireStartPin] = useState<Pin | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [marquee, setMarquee] = useState<{ ax: number; ay: number; bx: number; by: number } | null>(null);
  const [panning, setPanning] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [history, setHistory] = useState<{ comps: PlacedComponent[]; wires: Wire[]; junctions: { x: number; y: number }[] }[]>([]);
  const [showStats, setShowStats] = useState(true);
  const [assistOpen, setAssistOpen] = useState(false);
  // BLE feed lives here (not inside BuildAssistPanel) so ble.connect() can be
  // called directly from the Search button's onClick — Web Bluetooth requires
  // the call to originate from a user gesture (click event), and effects / child
  // lifecycle hooks do NOT satisfy that requirement.
  const ble = useBleFeed({ paused: !assistOpen });
  // True while a freshly-added component is "ghost-following" the cursor
  // until the user clicks once to drop it.
  const [placingId, setPlacingId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const snapTo = (val: number) => (snapEnabled ? Math.round(val / GRID) * GRID : val);

  const allPins = useMemo(() => components.flatMap(getCompPins), [components]);

  // Junctions are derived from wire endpoints where 3+ wires meet, AND
  // from explicit wire-tap points the user creates. We persist them so the
  // node is visible while wires exist — but we also PRUNE any junction that
  // no wire touches anymore (otherwise dots float on an empty canvas).
  useEffect(() => {
    const counts = new Map<string, { x: number; y: number; count: number }>();
    wires.forEach(w => {
      [w.points[0], w.points[w.points.length - 1]].forEach(p => {
        const k = `${p.x},${p.y}`;
        const e = counts.get(k);
        if (e) e.count++; else counts.set(k, { x: p.x, y: p.y, count: 1 });
      });
    });
    const newJns = Array.from(counts.values()).filter(p => p.count >= 3);
    // A junction is "alive" if at least one wire passes through or ends at it.
    const wireTouches = (jx: number, jy: number) =>
      wires.some(w => w.points.some(p => p.x === jx && p.y === jy));
    setJunctions((prev) => {
      const seen = new Set(prev.map(p => `${p.x},${p.y}`));
      const merged = prev.filter(j => wireTouches(j.x, j.y));
      newJns.forEach(n => { if (!seen.has(`${n.x},${n.y}`)) merged.push(n); });
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wires]);

  const findNearestPin = useCallback((x: number, y: number, excludeCompId?: string): Pin | null => {
    let best: Pin | null = null;
    let bestDist = PIN_SNAP_RADIUS;
    for (const pin of allPins) {
      if (excludeCompId && pin.compId === excludeCompId) continue;
      const d = Math.hypot(pin.x - x, pin.y - y);
      if (d < bestDist) { bestDist = d; best = pin; }
    }
    return best;
  }, [allPins]);

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-40), { comps: components, wires, junctions }]);
  }, [components, wires, junctions]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setComponents(prev.comps);
    setWires(prev.wires);
    setJunctions(prev.junctions);
    setHistory(h => h.slice(0, -1));
  }, [history]);

  // ─── Keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const key = e.key.toLowerCase();

      // Ctrl+Z = undo, Ctrl+R = rotate tool
      if ((e.ctrlKey || e.metaKey) && key === "z") { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && key === "r") { e.preventDefault(); setActiveTool("rotate"); return; }

      // Plain keys (not when modifier held — to avoid conflicts with browser)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (key === "m") setActiveTool("move");
      else if (key === "p") setActiveTool("pan");
      else if (key === "w") { setActiveTool("wire"); setWireStartPin(null); }
      else if (key === "escape") {
        setWireStartPin(null);
        setSelectedId(null);
        setSelectedWireId(null);
        setSelectedIds(new Set());
        setSelectedWireIds(new Set());
        setMarquee(null);
        setAssistOpen(false);
        // Cancel ghost-placement: remove the part that was following cursor.
        if (placingId) {
          setComponents(prev => prev.filter(c => c.id !== placingId));
          setPlacingId(null);
        }
      } else if (key === "delete" || key === "backspace") {
        if (selectedIds.size > 0 || selectedWireIds.size > 0) {
          pushHistory();
          setComponents(prev => prev.filter(c => !selectedIds.has(c.id)));
          setWires(prev => prev.filter(w =>
            !selectedWireIds.has(w.id) &&
            !selectedIds.has(w.startPin.compId) &&
            !selectedIds.has(w.endPin.compId)
          ));
          setSelectedIds(new Set());
          setSelectedWireIds(new Set());
          setSelectedId(null);
          setSelectedWireId(null);
          return;
        }
        if (selectedWireId) {
          pushHistory();
          setWires(prev => prev.filter(w => w.id !== selectedWireId));
          setSelectedWireId(null);
          return;
        }
        if (selectedId) {
          pushHistory();
          setComponents(prev => prev.filter(c => c.id !== selectedId));
          setWires(prev => prev.filter(w => w.startPin.compId !== selectedId && w.endPin.compId !== selectedId));
          setSelectedId(null);
          return;
        }
        // Nothing selected → switch to delete tool
        setActiveTool("delete");
      } else if (ADD_SHORTCUTS[key]) {
        const part = componentParts.find(p => p.name === ADD_SHORTCUTS[key]);
        if (part) addComponent(part);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, selectedId, selectedWireId, selectedIds, selectedWireIds, pushHistory, undo, components]);

  const addComponent = (part: typeof componentParts[0]) => {
    const count = components.filter(c => c.type === part.name).length + 1;
    // Drop the new part at the current cursor position (if known) or the
    // visible canvas center — never a random offset. Then immediately select
    // Move and start dragging so the user can place it precisely.
    const rect = canvasRef.current?.getBoundingClientRect();
    let dropX: number, dropY: number;
    if (cursorPos) {
      dropX = snapTo(cursorPos.x - COMP_W / 2);
      dropY = snapTo(cursorPos.y - COMP_H / 2);
    } else if (rect) {
      const cx = (rect.width / 2 - panOffset.x) / zoom;
      const cy = (rect.height / 2 - panOffset.y) / zoom;
      dropX = snapTo(cx - COMP_W / 2);
      dropY = snapTo(cy - COMP_H / 2);
    } else {
      dropX = snapTo(120 - panOffset.x / zoom);
      dropY = snapTo(120 - panOffset.y / zoom);
    }
    const newComp: PlacedComponent = {
      id: genId(),
      type: part.name,
      label: `${part.name}${count}`,
      color: part.color,
      textColor: part.textColor,
      x: dropX,
      y: dropY,
      value: part.defaultValue,
      rotation: 0,
    };
    pushHistory();
    setComponents(prev => [...prev, newComp]);
    setActiveTool("move");
    setSelectedId(newComp.id);
    // Ghost-placement: component follows cursor until user clicks to drop.
    setPlacingId(newComp.id);
    setDragOffset({ x: COMP_W / 2, y: COMP_H / 2 });
  };

  const duplicateSelected = () => {
    const comp = components.find(c => c.id === selectedId);
    if (!comp) return;
    const count = components.filter(c => c.type === comp.type).length + 1;
    const dup: PlacedComponent = {
      ...comp, id: genId(), label: `${comp.type}${count}`,
      x: comp.x + GRID * 3, y: comp.y + GRID * 2,
    };
    pushHistory();
    setComponents(prev => [...prev, dup]);
    setSelectedId(dup.id);
  };

  const canvasCoords = useCallback((e: React.PointerEvent | React.MouseEvent | { clientX: number; clientY: number }) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    const { x, y } = canvasCoords(e);

    // Ghost-placement commit: a freshly-added component is following the
    // cursor; the next canvas click drops it in place.
    if (placingId) {
      pushHistory();
      setPlacingId(null);
      return;
    }

    if (activeTool === "pan") {
      setPanning({ sx: e.clientX, sy: e.clientY, ox: panOffset.x, oy: panOffset.y });
      return;
    }

    if (activeTool === "wire") {
      const pin = findNearestPin(x, y);
      const wireHit = !pin ? findNearestWirePoint(wires, x, y) : null;

      const resolveStart = (): Pin => {
        if (pin) return pin;
        if (wireHit) {
          // Persist a junction dot so the tap point is a clear node, even
          // after the wire it sits on gets deleted.
          setJunctions(prev =>
            prev.some(j => j.x === wireHit.x && j.y === wireHit.y)
              ? prev
              : [...prev, { x: wireHit.x, y: wireHit.y }]
          );
          return { compId: `wire:${wireHit.wireId}`, side: "left", x: wireHit.x, y: wireHit.y };
        }
        return { compId: "", side: "left", x: snapTo(x), y: snapTo(y) };
      };
      const resolveEnd = (): Pin => {
        if (pin) return pin;
        if (wireHit) {
          setJunctions(prev =>
            prev.some(j => j.x === wireHit.x && j.y === wireHit.y)
              ? prev
              : [...prev, { x: wireHit.x, y: wireHit.y }]
          );
          return { compId: `wire:${wireHit.wireId}`, side: "right", x: wireHit.x, y: wireHit.y };
        }
        return { compId: "", side: "right", x: snapTo(x), y: snapTo(y) };
      };

      if (!wireStartPin) {
        setWireStartPin(resolveStart());
      } else {
        const endPin = resolveEnd();
        if (Math.hypot(wireStartPin.x - endPin.x, wireStartPin.y - endPin.y) > 8) {
          const points = routeWire(wireStartPin, endPin);
          pushHistory();
          setWires(prev => [...prev, { id: wireGenId(), startPin: wireStartPin, endPin, points }]);
        }
        setWireStartPin(null);
      }
      return;
    }

    // Marquee selection works in MOVE, DELETE, and ROTATE modes (anywhere
    // except WIRE & PAN). This lets the user box-select to delete or rotate.
    if (activeTool === "move" || activeTool === "delete" || activeTool === "rotate") {
      setSelectedId(null);
      setSelectedWireId(null);
      setSelectedIds(new Set());
      setSelectedWireIds(new Set());
      setMarquee({ ax: x, ay: y, bx: x, by: y });
    }
  }, [activeTool, wireStartPin, snapEnabled, findNearestPin, canvasCoords, panOffset, pushHistory, wires]);

  const handleWireClick = (e: React.MouseEvent, wire: Wire) => {
    e.stopPropagation();
    if (activeTool === "delete") {
      pushHistory();
      setWires(prev => prev.filter(w => w.id !== wire.id));
      return;
    }
    if (activeTool === "move") {
      setSelectedWireId(wire.id);
      setSelectedId(null);
    }
  };

  const handleComponentPointerDown = (e: React.PointerEvent, comp: PlacedComponent) => {
    e.stopPropagation();
    // If this component is the one ghost-following the cursor, commit-drop it.
    if (placingId === comp.id) {
      pushHistory();
      setPlacingId(null);
      return;
    }
    if (activeTool === "pan") {
      setPanning({ sx: e.clientX, sy: e.clientY, ox: panOffset.x, oy: panOffset.y });
      return;
    }
    if (activeTool === "wire") {
      const { x, y } = canvasCoords(e);
      const pins = getCompPins(comp);
      let closest = pins[0]; let cd = Infinity;
      for (const p of pins) { const d = Math.hypot(p.x - x, p.y - y); if (d < cd) { cd = d; closest = p; } }
      if (!wireStartPin) setWireStartPin(closest);
      else {
        if (Math.hypot(wireStartPin.x - closest.x, wireStartPin.y - closest.y) > 8) {
          const points = routeWire(wireStartPin, closest);
          pushHistory();
          setWires(prev => [...prev, { id: wireGenId(), startPin: wireStartPin, endPin: closest, points }]);
        }
        setWireStartPin(null);
      }
      return;
    }
    if (activeTool === "delete") {
      pushHistory();
      setComponents(prev => prev.filter(c => c.id !== comp.id));
      setWires(prev => prev.filter(w => w.startPin.compId !== comp.id && w.endPin.compId !== comp.id));
      return;
    }
    if (activeTool === "rotate") {
      pushHistory();
      setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, rotation: (c.rotation + 90) % 360 } : c));
      setTimeout(() => {
        const updated = circuitStore.get().components.find(c => c.id === comp.id);
        if (!updated) return;
        const newPins = getCompPins(updated);
        setWires(prevWires => prevWires.map(w => {
          let sp = w.startPin, ep = w.endPin, changed = false;
          if (w.startPin.compId === comp.id) { const p = newPins.find(p => p.side === w.startPin.side); if (p) { sp = p; changed = true; } }
          if (w.endPin.compId === comp.id) { const p = newPins.find(p => p.side === w.endPin.side); if (p) { ep = p; changed = true; } }
          return changed ? { ...w, startPin: sp, endPin: ep, points: routeWire(sp, ep) } : w;
        }));
      }, 0);
      return;
    }
    if (activeTool === "move") {
      if (selectedIds.has(comp.id)) {
        const positions = new Map<string, { x: number; y: number }>();
        components.forEach(c => { if (selectedIds.has(c.id)) positions.set(c.id, { x: c.x, y: c.y }); });
        setGroupDragStart({ ax: comp.x, ay: comp.y, positions });
      } else {
        setSelectedIds(new Set());
        setSelectedWireIds(new Set());
      }
      setSelectedId(comp.id);
      setSelectedWireId(null);
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: (e.clientX - rect.left - panOffset.x) / zoom - comp.x,
        y: (e.clientY - rect.top - panOffset.y) / zoom - comp.y,
      });
      setDraggingId(comp.id);
    }
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current) return;

    // Active panning drag
    if (panning) {
      setPanOffset({
        x: clampPan(panning.ox + (e.clientX - panning.sx)),
        y: clampPan(panning.oy + (e.clientY - panning.sy)),
      });
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - panOffset.x) / zoom;
    const rawY = (e.clientY - rect.top - panOffset.y) / zoom;
    setCursorPos({ x: rawX, y: rawY });

    if (marquee && !draggingId && !placingId) {
      setMarquee(m => m ? { ...m, bx: rawX, by: rawY } : m);
      return;
    }

    // Ghost-placement: a freshly-added component follows the cursor without
    // any button being held, until the user clicks once to drop it.
    if (placingId && !draggingId) {
      const nx = snapTo(rawX - dragOffset.x);
      const ny = snapTo(rawY - dragOffset.y);
      setComponents(prev => prev.map(c => c.id === placingId ? { ...c, x: nx, y: ny } : c));
      return;
    }

    if (!draggingId) return;

    if (groupDragStart && selectedIds.has(draggingId)) {
      const dx = snapTo(rawX - dragOffset.x) - groupDragStart.ax;
      const dy = snapTo(rawY - dragOffset.y) - groupDragStart.ay;
      const updated = components.map(c => {
        const orig = groupDragStart.positions.get(c.id);
        return orig ? { ...c, x: orig.x + dx, y: orig.y + dy } : c;
      });
      setComponents(updated);
      setWires(prevWires => prevWires.map(w => {
        const moved = selectedIds.has(w.startPin.compId) || selectedIds.has(w.endPin.compId);
        if (!moved) return w;
        const sc = updated.find(c => c.id === w.startPin.compId);
        const ec = updated.find(c => c.id === w.endPin.compId);
        let sp = w.startPin, ep = w.endPin;
        if (sc) { const np = getCompPins(sc).find(p => p.side === w.startPin.side); if (np) sp = np; }
        if (ec) { const np = getCompPins(ec).find(p => p.side === w.endPin.side); if (np) ep = np; }
        return { ...w, startPin: sp, endPin: ep, points: routeWire(sp, ep) };
      }));
      return;
    }

    const nx = snapTo(rawX - dragOffset.x);
    const ny = snapTo(rawY - dragOffset.y);
    const updated = components.map(c => c.id === draggingId ? { ...c, x: nx, y: ny } : c);
    setComponents(updated);
    const dragComp = updated.find(c => c.id === draggingId);
    if (dragComp) {
      const newPins = getCompPins(dragComp);
      setWires(prevWires => prevWires.map(w => {
        let changed = false, sp = w.startPin, ep = w.endPin;
        if (w.startPin.compId === draggingId) { const pin = newPins.find(p => p.side === w.startPin.side); if (pin) { sp = pin; changed = true; } }
        if (w.endPin.compId === draggingId) { const pin = newPins.find(p => p.side === w.endPin.side); if (pin) { ep = pin; changed = true; } }
        if (!changed) return w;
        return { ...w, startPin: sp, endPin: ep, points: routeWire(sp, ep) };
      }));
    }
  }, [draggingId, dragOffset, zoom, snapEnabled, panOffset, marquee, groupDragStart, selectedIds, components, panning]);

  const handlePointerUp = () => {
    setPanning(null);
    if (marquee) {
      const x1 = Math.min(marquee.ax, marquee.bx), x2 = Math.max(marquee.ax, marquee.bx);
      const y1 = Math.min(marquee.ay, marquee.by), y2 = Math.max(marquee.ay, marquee.by);
      if (x2 - x1 > 4 || y2 - y1 > 4) {
        const compIds = new Set(
          components.filter(c => c.x + COMP_W >= x1 && c.x <= x2 && c.y + COMP_H >= y1 && c.y <= y2).map(c => c.id)
        );
        const wireIds = new Set(
          wires.filter(w => w.points.some(p => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2)).map(w => w.id)
        );

        // In ROTATE / DELETE mode, immediately apply the action to the marquee.
        if (activeTool === "delete" && (compIds.size || wireIds.size)) {
          pushHistory();
          setComponents(prev => prev.filter(c => !compIds.has(c.id)));
          setWires(prev => prev.filter(w =>
            !wireIds.has(w.id) && !compIds.has(w.startPin.compId) && !compIds.has(w.endPin.compId)
          ));
        } else if (activeTool === "rotate" && compIds.size) {
          pushHistory();
          setComponents(prev => prev.map(c =>
            compIds.has(c.id) ? { ...c, rotation: (c.rotation + 90) % 360 } : c
          ));
        } else {
          setSelectedIds(compIds);
          setSelectedWireIds(wireIds);
        }
      }
      setMarquee(null);
    }
    if (draggingId) pushHistory();
    setDraggingId(null);
    setGroupDragStart(null);
  };

  const startEdit = (comp: PlacedComponent) => {
    setEditingId(comp.id);
    setEditValue(comp.value);
    setEditLabel(comp.label);
  };

  const saveEdit = () => {
    if (editingId) {
      setComponents(prev => prev.map(c => c.id === editingId ? { ...c, value: editValue, label: editLabel } : c));
      setEditingId(null);
    }
  };

  const clearAll = () => {
    if (components.length === 0 && wires.length === 0 && junctions.length === 0) return;
    pushHistory();
    setComponents([]);
    setWires([]);
    setJunctions([]);
    setSelectedId(null);
    setSelectedWireId(null);
  };

  // Wheel: ctrl/meta = zoom under cursor, otherwise gentle pan with caps
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const oldZoom = zoom;
      const newZoom = Math.min(3, Math.max(0.3, oldZoom - e.deltaY * 0.002));
      // Keep the world-point under the cursor stationary:
      //   world = (screen - pan) / zoom  → solve for newPan.
      const wx = (mx - panOffset.x) / oldZoom;
      const wy = (my - panOffset.y) / oldZoom;
      setZoom(newZoom);
      setPanOffset({ x: clampPan(mx - wx * newZoom), y: clampPan(my - wy * newZoom) });
    } else {
      // Gentle pan — clamp delta so trackpads don't fling to the edge.
      const dx = Math.max(-40, Math.min(40, e.deltaX)) * 0.5;
      const dy = Math.max(-40, Math.min(40, e.deltaY)) * 0.5;
      setPanOffset(prev => ({ x: clampPan(prev.x - dx), y: clampPan(prev.y - dy) }));
    }
  }, [zoom, panOffset]);

  // Zoom-at-center for the +/- header buttons
  const zoomBy = (delta: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = rect.width / 2, my = rect.height / 2;
    const oldZoom = zoom;
    const newZoom = Math.min(3, Math.max(0.3, oldZoom + delta));
    const wx = (mx - panOffset.x) / oldZoom;
    const wy = (my - panOffset.y) / oldZoom;
    setZoom(newZoom);
    setPanOffset({ x: clampPan(mx - wx * newZoom), y: clampPan(my - wy * newZoom) });
  };

  // ─── Computed visuals ───────────────────────────────────
  const highlightPin = useMemo(() => {
    if (activeTool !== "wire" || !cursorPos) return null;
    return findNearestPin(cursorPos.x, cursorPos.y);
  }, [activeTool, cursorPos, findNearestPin]);

  const wireHoverHit = useMemo(() => {
    if (activeTool !== "wire" || !cursorPos || highlightPin) return null;
    return findNearestWirePoint(wires, cursorPos.x, cursorPos.y);
  }, [activeTool, cursorPos, highlightPin, wires]);

  const previewPoints = useMemo(() => {
    if (!wireStartPin || !cursorPos || activeTool !== "wire") return null;
    const endSnap = highlightPin
      ? { x: highlightPin.x, y: highlightPin.y }
      : wireHoverHit
        ? { x: wireHoverHit.x, y: wireHoverHit.y }
        : { x: snapTo(cursorPos.x), y: snapTo(cursorPos.y) };
    return routeWire(wireStartPin, endSnap);
  }, [wireStartPin, cursorPos, activeTool, highlightPin, wireHoverHit, snapEnabled]);

  const polylineStr = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x},${p.y}`).join(" ");

  const selectedComp = components.find(c => c.id === selectedId);

  const stats = useMemo(() => {
    const types = new Map<string, number>();
    components.forEach(c => types.set(c.type, (types.get(c.type) || 0) + 1));
    return { total: components.length, wires: wires.length, types };
  }, [components, wires]);

  const cursorClass =
    activeTool === "wire" ? "cursor-crosshair" :
    activeTool === "delete" ? "cursor-pointer" :
    activeTool === "pan" ? (panning ? "cursor-grabbing" : "cursor-grab") :
    activeTool === "rotate" ? "cursor-pointer" :
    "cursor-default";

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-bold leading-tight">Circuit Builder</h1>
            {showStats && (
              <p className="text-[10px] text-muted-foreground">{stats.total} parts · {stats.wires} wires</p>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={undo} disabled={history.length === 0} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Undo (Ctrl+Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => zoomBy(-0.15)} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} className="rounded-lg border border-border bg-card px-2 text-[10px] font-mono text-muted-foreground min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => zoomBy(0.15)} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setAssistOpen(true);
              // connect() MUST be called here, inside the onClick handler, to
              // satisfy the Web Bluetooth user-gesture requirement. Calling it
              // later from an effect or child component will be silently blocked.
              if (!ble.connected) void ble.connect();
            }}
            className={`rounded-lg border p-2 transition-colors ${
              ble.connected
                ? "border-inductor/60 bg-inductor/20 text-inductor"
                : "border-inductor/40 bg-inductor/10 text-inductor hover:brightness-110"
            }`}
            title={ble.connected ? "Build-Assist (connected)" : "Build-Assist (measure & match)"}
          >
            {ble.connected
              ? <Bluetooth className="h-3.5 w-3.5" />
              : <Search className="h-3.5 w-3.5" />
            }
          </button>
          <button onClick={clearAll} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-destructive" title="Clear All">
            <Eraser className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => navigate("/validation")} className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary" title="Validate Circuit">
            <Play className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary" title="Save">
            <Save className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tool bar */}
      <div className="flex items-center gap-1.5 px-3 mb-2 overflow-x-auto">
        {toolDefs.map(({ id, icon: Icon, label, shortcut }) => (
          <button
            key={id}
            onClick={() => { setActiveTool(id); setWireStartPin(null); }}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all shrink-0 ${
              activeTool === id ? "bg-primary text-primary-foreground shadow-md" : "border border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
            title={`${label} (${shortcut})`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <kbd className="hidden sm:inline ml-1 text-[8px] opacity-50 bg-background/30 rounded px-1">{shortcut}</kbd>
          </button>
        ))}
        <div className="flex-1" />
        {selectedComp && (
          <button onClick={duplicateSelected} className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground shrink-0" title="Duplicate">
            <Copy className="h-3 w-3" />
          </button>
        )}
        <button onClick={() => setSnapEnabled(!snapEnabled)} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shrink-0 ${snapEnabled ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
          <Grid3X3 className="h-3.5 w-3.5" /> Snap
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`flex-1 mx-3 rounded-2xl border border-border bg-card overflow-hidden relative card-glow ${cursorClass}`}
        style={{ minHeight: 340 }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={(e) => {
          // Double-click anywhere on a component — even outside Move mode —
          // opens the Edit dialog. We test the event target chain.
          const target = e.target as HTMLElement;
          const compEl = target.closest("[data-comp-id]") as HTMLElement | null;
          if (compEl) {
            const id = compEl.dataset.compId!;
            const c = components.find(x => x.id === id);
            if (c) startEdit(c);
          }
        }}
      >
        {/* Infinite grid: lives OUTSIDE the pan/zoom transform so it always
            fills the visible canvas. We fake "scrolling" by shifting the
            background-position by the pan offset, and scale the cell size
            with the current zoom. Result: the grid never runs out. */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.5) 1px, transparent 1px)",
            backgroundSize: `${GRID * zoom}px ${GRID * zoom}px`,
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
          }}
        />
        <div className="absolute inset-0" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>

          <svg className="absolute" style={{ width: 4000, height: 4000, left: -1000, top: -1000, overflow: "visible" }}>
            <g transform="translate(1000,1000)">
              {wires.map(wire => {
                const isSel = selectedWireId === wire.id;
                const isMulti = selectedWireIds.has(wire.id);
                const stroke = isSel ? "hsl(var(--destructive))" : isMulti ? "hsl(var(--accent))" : "hsl(var(--primary))";
                return (
                  <g key={wire.id} onClick={(e) => handleWireClick(e as any, wire)} className="cursor-pointer">
                    <polyline points={polylineStr(wire.points)} fill="none" stroke="transparent" strokeWidth="14" />
                    <polyline points={polylineStr(wire.points)} fill="none" stroke={stroke} strokeWidth={isSel || isMulti ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision" className="transition-colors" />
                    <circle cx={wire.points[0].x} cy={wire.points[0].y} r="2.5" fill="hsl(var(--primary))" />
                    <circle cx={wire.points[wire.points.length - 1].x} cy={wire.points[wire.points.length - 1].y} r="2.5" fill="hsl(var(--primary))" />
                  </g>
                );
              })}

              {/* Persisted junction dots — survive even when their wires are deleted */}
              {junctions.map((jp, i) => (
                <circle key={`j-${i}`} cx={jp.x} cy={jp.y} r="5" fill="hsl(var(--primary))" className="pointer-events-none" />
              ))}

              {activeTool === "wire" && wireHoverHit && !highlightPin && (
                <circle cx={wireHoverHit.x} cy={wireHoverHit.y} r="7" fill="hsl(var(--primary))" opacity="0.4" className="pointer-events-none" />
              )}

              {previewPoints && (
                <g className="pointer-events-none">
                  <polyline points={polylineStr(previewPoints)} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 5" opacity="0.5" />
                  <circle cx={previewPoints[0].x} cy={previewPoints[0].y} r="5" fill="hsl(var(--primary))" opacity="0.7" />
                  {highlightPin && (
                    <circle cx={highlightPin.x} cy={highlightPin.y} r="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.6">
                      <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              )}

              {components.map(comp => {
                const pins = getCompPins(comp);
                const cx = comp.x + COMP_W / 2;
                const cy = comp.y + COMP_H / 2;
                return pins.map((pin, i) => {
                  const label = getPinLabel(comp.type, pin.side);
                  // Compute label offset along the actual direction from
                  // component center → pin, so labels stay OUTSIDE the body
                  // even when the component is rotated 90/180/270°.
                  const vx = pin.x - cx;
                  const vy = pin.y - cy;
                  const len = Math.hypot(vx, vy) || 1;
                  const ox = (vx / len) * 12;
                  const oy = (vy / len) * 12;
                  const anchor = vx > 2 ? "start" : vx < -2 ? "end" : "middle";
                  const isHighlight = activeTool === "wire" && pin === highlightPin;
                  return (
                    <g key={`${comp.id}-pin-${i}`} className="pointer-events-none">
                      <circle cx={pin.x} cy={pin.y} r={isHighlight ? 7 : 4} fill={isHighlight ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} opacity={isHighlight ? 0.9 : (activeTool === "wire" ? 0.35 : 0.2)} />
                      {isHighlight && <circle cx={pin.x} cy={pin.y} r="12" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" />}
                      {label && (
                        <text x={pin.x + ox} y={pin.y + oy} textAnchor={anchor} dominantBaseline="central" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace" fontWeight="bold" opacity="0.95" style={{ paintOrder: "stroke", stroke: "hsl(var(--background))", strokeWidth: 3, strokeLinejoin: "round" }}>
                          {label}
                        </text>
                      )}
                    </g>
                  );
                });
              })}
            </g>
          </svg>

          {components.map(comp => {
            const isMulti = selectedIds.has(comp.id);
            const isSel = selectedId === comp.id;
            // Family color → resolved hsl() string for SVG strokes
            const accent = `hsl(var(--${comp.textColor.replace("text-", "")}))`;
            // Selection / found halo (subtle background glow only — no boxy
            // background fill, so the schematic looks like a real schematic).
            const haloClass = comp.found
              ? "shadow-[0_0_18px_hsl(var(--inductor)/0.55)]"
              : isSel
                ? "shadow-[0_0_18px_hsl(var(--primary)/0.45)]"
                : isMulti
                  ? "shadow-[0_0_14px_hsl(var(--accent)/0.4)]"
                  : "";
            const ringClass = comp.found
              ? "ring-1 ring-inductor/60"
              : isSel
                ? "ring-1 ring-primary/60"
                : isMulti
                  ? "ring-1 ring-accent/60"
                  : "";
            return (
              <div
                key={comp.id}
                data-comp-id={comp.id}
                className={`absolute ${draggingId === comp.id ? "cursor-grabbing" : "cursor-grab"} ${haloClass} ${ringClass} rounded-md`}
                style={{ left: comp.x, top: comp.y, width: COMP_W, height: COMP_H, transform: `rotate(${comp.rotation}deg)` }}
                onPointerDown={(e) => handleComponentPointerDown(e, comp)}
                onDoubleClick={(e) => { e.stopPropagation(); startEdit(comp); }}
              >
                {/* The schematic glyph itself — rotates with the component */}
                <SchematicBody type={comp.type} color={comp.textColor} accent={accent} />

                {/* Label + value floats next to the symbol and counter-rotates
                    so the text stays upright at every orientation.            */}
                <div
                  className="absolute left-1/2 top-1/2 pointer-events-none flex flex-col items-center"
                  style={{ transform: `translate(-50%, -50%) rotate(-${comp.rotation}deg) translateY(${COMP_H / 2 + 8}px)` }}
                >
                  <span className={`text-[10px] font-bold font-mono ${comp.textColor} leading-none whitespace-nowrap`} style={{ paintOrder: "stroke", WebkitTextStroke: "3px hsl(var(--background))" }}>{comp.label}</span>
                  {comp.value && <span className="text-[9px] font-semibold font-mono text-foreground/80 leading-none mt-0.5 whitespace-nowrap" style={{ paintOrder: "stroke", WebkitTextStroke: "3px hsl(var(--background))" }}>{comp.value}</span>}
                  {comp.found && <span className="text-[7px] font-bold text-inductor leading-none mt-0.5">✓ FOUND</span>}
                </div>
              </div>
            );
          })}

          {marquee && (
            <div
              className="absolute pointer-events-none border-2 border-dashed rounded-sm"
              style={{
                left: Math.min(marquee.ax, marquee.bx),
                top: Math.min(marquee.ay, marquee.by),
                width: Math.abs(marquee.bx - marquee.ax),
                height: Math.abs(marquee.by - marquee.ay),
                borderColor: activeTool === "delete" ? "hsl(var(--destructive))" : activeTool === "rotate" ? "hsl(var(--bjt))" : "hsl(var(--primary))",
                backgroundColor: activeTool === "delete" ? "hsl(var(--destructive) / 0.1)" : activeTool === "rotate" ? "hsl(var(--bjt) / 0.1)" : "hsl(var(--primary) / 0.1)",
              }}
            />
          )}
        </div>

        {components.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Layers className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/50">Add components from the library below</p>
          </div>
        )}

        <AnimatePresence>
          {activeTool === "wire" && wireStartPin && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-primary/20 border border-primary/30 px-4 py-1.5 text-[10px] font-medium text-primary backdrop-blur-md flex items-center gap-2">
              <CircleDot className="h-3 w-3 animate-pulse" />
              Tap pin or wire dot to complete · <kbd className="text-[8px] bg-primary/20 rounded px-1">Esc</kbd> cancel
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-2 right-3 text-[9px] text-muted-foreground/40 select-none pointer-events-none">
          {activeTool === "pan" ? "Drag to pan" : "Drag = marquee · Ctrl+Scroll = zoom"}
        </div>
      </div>

      {/* Multi-select bar */}
      <AnimatePresence>
        {(selectedIds.size + selectedWireIds.size > 1) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mx-3 mt-2 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">
                {selectedIds.size} part{selectedIds.size !== 1 ? "s" : ""}
                {selectedWireIds.size > 0 && ` · ${selectedWireIds.size} wire${selectedWireIds.size !== 1 ? "s" : ""}`} selected
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  pushHistory();
                  setComponents(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, rotation: (c.rotation + 90) % 360 } : c));
                }}
                className="flex items-center gap-1 rounded-lg bg-card border border-border px-2.5 py-1.5 text-[11px] text-foreground"
              >
                <RotateCw className="h-3 w-3" /> Rotate
              </button>
              <button
                onClick={() => {
                  pushHistory();
                  setComponents(prev => prev.filter(c => !selectedIds.has(c.id)));
                  setWires(prev => prev.filter(w =>
                    !selectedWireIds.has(w.id) && !selectedIds.has(w.startPin.compId) && !selectedIds.has(w.endPin.compId)
                  ));
                  setSelectedIds(new Set());
                  setSelectedWireIds(new Set());
                }}
                className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-[11px] font-medium text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected component bar */}
      <AnimatePresence>
        {selectedComp && !editingId && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
            <ComponentSymbol type={selectedComp.type} color={selectedComp.textColor} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{selectedComp.label}</p>
              {selectedComp.value && <p className="text-[10px] text-muted-foreground truncate">{selectedComp.value}</p>}
            </div>
            <button onClick={() => startEdit(selectedComp)} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground">Edit</button>
            <button onClick={duplicateSelected} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground" title="Duplicate"><Copy className="h-3 w-3" /></button>
            <button onClick={() => { pushHistory(); setComponents(prev => prev.map(c => c.id === selectedId ? { ...c, rotation: (c.rotation + 90) % 360 } : c)); }} className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground" title="Rotate"><RotateCw className="h-3 w-3" /></button>
            <button onClick={() => { pushHistory(); setComponents(prev => prev.filter(c => c.id !== selectedId)); setWires(prev => prev.filter(w => w.startPin.compId !== selectedId && w.endPin.compId !== selectedId)); setSelectedId(null); }} className="rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20" title="Delete"><Trash2 className="h-3 w-3" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected wire bar */}
      <AnimatePresence>
        {selectedWireId && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mx-3 mt-2 flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2">
            <div className="flex items-center gap-2">
              <Minus className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">Wire selected</span>
            </div>
            <button onClick={() => { pushHistory(); setWires(prev => prev.filter(w => w.id !== selectedWireId)); setSelectedWireId(null); }} className="flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-[11px] font-medium text-destructive-foreground">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit dialog */}
      <AnimatePresence>
        {editingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setEditingId(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-xl w-[300px]" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold mb-1">Edit Component</h3>
              <p className="text-xs text-muted-foreground mb-4">{components.find(c => c.id === editingId)?.type} — Modify label and value</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1 block">Label</label>
                  <input autoFocus value={editLabel} onChange={e => setEditLabel(e.target.value)} className="w-full rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" placeholder="e.g. R1, C3" />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1 block">Value</label>
                  <input value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit()} className="w-full rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30" placeholder="e.g. 10kΩ, 100nF" />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" /> Cancel
                </button>
                <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground">
                  <Check className="h-3 w-3" /> Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Build-Assist panel */}
      <BuildAssistPanel
        open={assistOpen}
        ble={ble}
        onClose={() => setAssistOpen(false)}
        onAccept={(id) => {
          setComponents(prev => prev.map(c => c.id === id ? { ...c, found: true } : c));
        }}
      />

      {/* Component library */}
      <div className="px-3 pt-2">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Component Library</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1">
          {componentParts.map((part) => (
            <button
              key={part.name}
              onClick={() => addComponent(part)}
              className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-card px-3 py-2 transition-all hover:border-primary/30 hover:bg-secondary active:scale-95 shrink-0"
              title={`${part.label} (${Object.entries(ADD_SHORTCUTS).find(([, v]) => v === part.name)?.[0]?.toUpperCase() ?? ""})`}
            >
              <ComponentSymbol type={part.name} color={part.textColor} />
              <span className="text-[8px] text-muted-foreground font-medium">{part.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BuildAssistPanel — measure a real part, match it to an unfound schematic part
// ============================================================================
// Floating bottom-sheet. While open it subscribes to the live BLE feed and
// finds the best-matching unfound component on the schematic. The user can
// Accept (mark FOUND) or Skip (re-measure). All super lightweight — never
// pulls the user out of CircuitBuilder.
// ============================================================================
// ============================================================================
// BuildAssistPanel — measure a real part, match it to an unfound schematic part
// ============================================================================
// Floating bottom-sheet. While open it subscribes to the live BLE feed and
// finds the best-matching unfound component on the schematic. The user can
// Accept (mark FOUND) or Skip (re-measure). All super lightweight — never
// pulls the user out of CircuitBuilder.
// ============================================================================

// ── Display helpers ───────────────────────────────────────────────────────────

/** Human-readable label for each firmware-detected component family. */
const DETECTED_LABEL: Record<string, string> = {
  resistor:  "Resistor",
  capacitor: "Capacitor",
  inductor:  "Inductor",
  diode:     "Diode",
  bjt:       "BJT",
  mosfet:    "MOSFET",
  jfet:      "JFET",
  thyristor: "SCR (Thyristor)",
  triac:     "Triac",
};

/**
 * The firmware `values` key whose reading is shown in the "Reading" cell.
 * Matches PRIMARY_KEY in match-measurement.ts — kept here so the panel
 * can display the correct value even before a schematic match is found.
 */
const PRIMARY_DISPLAY_KEY: Record<string, string> = {
  resistor:  "r",
  capacitor: "c",
  inductor:  "l",
  diode:     "vf",
  bjt:       "hfe",
  mosfet:    "vth",
  jfet:      "vgs",
  thyristor: "vgt",
  triac:     "vgt",
};

/**
 * Format pin-order for display.
 * e.g. { ordered: ["B","C","E"] } → "①B  ②C  ③E"
 *      { ordered: ["A","K"] }     → "①A  ②K"
 */
function formatPinOrder(po: ParsedPinOrder): string {
  const circled = ["①", "②", "③", "④"];
  return po.ordered
    .map((pin, i) => `${circled[i] ?? `${i + 1}.`}${pin}`)
    .join("  ");
}

// ── Component ─────────────────────────────────────────────────────────────────

// ── ReturnType alias for the ble prop ────────────────────────────────────────
type BleFeed = BleReadPayload & {
  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  bleSupported: boolean;
};

const BuildAssistPanel = ({
  open,
  ble,
  onClose,
  onAccept,
}: {
  open: boolean;
  /** Lifted from CircuitBuilder so connect() was already called from an onClick
   *  (user-gesture) context before the panel mounts. */
  ble: BleFeed;
  onClose: () => void;
  onAccept: (id: string) => void;
}) => {
  const stored = useCircuitStore();
  const [snapshot, setSnapshot] = useState<MatchResult | null>(null);
  const [tick, setTick]         = useState(0);

  // Recompute best match on every BLE tick or manual re-measure.
  useEffect(() => {
    if (!open || !ble.connected) return;
    const m = findBestMatch(ble, stored.components);
    setSnapshot(m);
  }, [ble, open, ble.connected, stored.components, tick]);

  // Clear stale snapshot whenever the connection drops.
  useEffect(() => {
    if (!ble.connected) setSnapshot(null);
  }, [ble.connected]);

  const remaining = stored.components.filter(
    (c) => !c.found && ["R", "C", "L", "D", "Q", "M", "J", "SCR", "TRI"].includes(c.type),
  ).length;

  // ── Derived display values (all null-safe) ───────────────────────────────
  const detectedLabel  = ble.detected ? (DETECTED_LABEL[ble.detected] ?? ble.detected) : "—";
  const primaryKey     = ble.detected ? PRIMARY_DISPLAY_KEY[ble.detected] : undefined;
  const primaryRawVal  = primaryKey && ble.values ? ble.values[primaryKey] : undefined;
  const readingDisplay = primaryRawVal ? `${primaryRawVal} ${primaryKey}` : "—";

  if (!open) return null;

  // ── BLE not supported in this browser ────────────────────────────────────
  if (!ble.bleSupported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[min(420px,calc(100vw-24px))] rounded-2xl border border-border bg-card p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Build-Assist</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <BluetoothOff className="h-6 w-6 text-destructive mx-auto mb-2 opacity-70" />
          <p className="text-xs font-semibold text-destructive mb-1">Web Bluetooth not supported</p>
          <p className="text-[10px] text-muted-foreground">Use Chrome or Edge on desktop / Android to connect to the HM-10 tester.</p>
        </div>
      </motion.div>
    );
  }

  // ── Disconnected — waiting for user to pick a device (or re-connect) ─────
  if (!ble.connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[min(420px,calc(100vw-24px))] rounded-2xl border border-inductor/40 bg-card p-4 shadow-2xl card-glow"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <h3 className="text-sm font-bold">Build-Assist</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="rounded-xl border border-border bg-background/30 p-5 text-center mb-3">
          <Bluetooth className="h-7 w-7 text-inductor mx-auto mb-2 opacity-60" />
          <p className="text-xs font-semibold mb-1">Not connected to tester</p>
          <p className="text-[10px] text-muted-foreground mb-4">
            Make sure the HM-10 module is powered on, then tap Connect.
          </p>
          {/* connect() here IS inside an onClick — satisfies Web Bluetooth gesture requirement */}
          <button
            onClick={() => void ble.connect()}
            className="w-full rounded-lg bg-inductor py-2.5 text-xs font-bold text-background"
          >
            <Bluetooth className="inline h-3.5 w-3.5 mr-1.5" />
            Connect to Tester
          </button>
        </div>

        <p className="text-center text-[9px] text-muted-foreground/60">
          A browser device-picker will appear. Select your HM-10 module.
        </p>
      </motion.div>
    );
  }

  // ── Connected — normal measuring UI ──────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[min(420px,calc(100vw-24px))] rounded-2xl border border-inductor/40 bg-card p-4 shadow-2xl card-glow"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-inductor animate-pulse" />
          <h3 className="text-sm font-bold">Build-Assist · Live Match</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Disconnect button — inside onClick so calling ble.disconnect() is fine (no gesture needed) */}
          <button
            onClick={() => ble.disconnect()}
            className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
            title="Disconnect BLE"
          >
            <BluetoothOff className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mb-3">
        Touch a real component to the tester. We'll match it to the best unfound part on the schematic.
      </p>

      {/* ── Detected / Reading row ── */}
      <div className="rounded-lg border border-border bg-background/50 px-3 py-2 mb-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Detected</p>
          <p className="text-sm font-bold">{detectedLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Reading</p>
          <p className="text-sm font-mono font-semibold">{readingDisplay}</p>
        </div>
      </div>

      {/* ── Pin-order row (only when firmware provides it) ── */}
      {ble.pinOrder && (
        <div className="rounded-lg border border-border bg-background/30 px-3 py-1.5 mb-2 flex items-center justify-between">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Pin order</p>
          <p className="text-xs font-mono tracking-wide">{formatPinOrder(ble.pinOrder)}</p>
        </div>
      )}

      {/* ── Best-match card ── */}
      {snapshot ? (
        <div className="rounded-xl border border-inductor/30 bg-inductor/5 p-3 mb-3">
          <p className="text-[9px] uppercase tracking-widest text-inductor mb-1">Best Match</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold">{snapshot.comp.label}</p>
              <p className="text-[10px] text-muted-foreground">Nominal {snapshot.comp.value}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono">{formatSI(snapshot.measured, "")}</p>
              <p className={`text-[10px] font-bold ${snapshot.errorPct < 5 ? "text-inductor" : snapshot.errorPct < 15 ? "text-bjt" : "text-destructive"}`}>
                ±{snapshot.errorPct.toFixed(1)}% error
              </p>
            </div>
          </div>
          {snapshot.pinOrder && (
            <p className="mt-2 text-[9px] text-muted-foreground font-mono">
              Wiring: {formatPinOrder(snapshot.pinOrder)}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background/30 p-3 mb-3 text-center">
          <p className="text-[11px] text-muted-foreground">
            {ble.detected
              ? `No matching unfound "${detectedLabel}" on schematic.`
              : "Waiting for a reading…"}
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setTick((t) => t + 1)}
          className="flex-1 rounded-lg border border-border bg-card py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Skip / Re-measure
        </button>
        <button
          disabled={!snapshot}
          onClick={() => {
            if (snapshot) {
              onAccept(snapshot.comp.id);
              setTick((t) => t + 1);
            }
          }}
          className="flex-1 rounded-lg bg-inductor py-2 text-xs font-bold text-background disabled:opacity-40"
        >
          <Check className="inline h-3 w-3 mr-1" /> Accept
        </button>
      </div>

      <p className="mt-2 text-center text-[9px] text-muted-foreground/70">
        {remaining} part{remaining !== 1 ? "s" : ""} still unfound
      </p>
    </motion.div>
  );
};

export default CircuitBuilder;