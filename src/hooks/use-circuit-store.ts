// ============================================================================
// useCircuitStore — module-level store so circuit survives page navigation
// ============================================================================
// React state inside CircuitBuilder used to be wiped whenever the user
// navigated away (because the component unmounts). We keep the source of
// truth here, in module scope, and expose a `useSyncExternalStore`-style
// hook so any mounted CircuitBuilder reads / writes the same data.
// ============================================================================

import { useSyncExternalStore } from "react";

export interface PlacedComponent {
  id: string;
  type: string;
  label: string;
  color: string;
  textColor: string;
  x: number;
  y: number;
  value: string;
  rotation: number;
  /** Set true when the user accepts a Build-Assist match for this part. */
  found?: boolean;
}

export interface Pin {
  compId: string;
  side: "left" | "right" | "top" | "bottom";
  x: number;
  y: number;
}

export interface Wire {
  id: string;
  startPin: Pin;
  endPin: Pin;
  points: { x: number; y: number }[];
}

export interface CircuitState {
  components: PlacedComponent[];
  wires: Wire[];
  /** Persisted junction dots (kept even when the wires that created them are gone). */
  junctions: { x: number; y: number }[];
  zoom: number;
  panOffset: { x: number; y: number };
}

const DEFAULT: CircuitState = {
  components: [
    { id: "c1", type: "R", label: "R1", color: "bg-resistor", textColor: "text-resistor", x: 60, y: 100, value: "10kΩ", rotation: 0 },
    { id: "c2", type: "C", label: "C1", color: "bg-capacitor", textColor: "text-capacitor", x: 220, y: 100, value: "100nF", rotation: 0 },
    { id: "c3", type: "GND", label: "GND1", color: "bg-muted-foreground", textColor: "text-muted-foreground", x: 220, y: 220, value: "", rotation: 0 },
  ],
  wires: [],
  junctions: [],
  zoom: 1,
  panOffset: { x: 0, y: 0 },
};

let state: CircuitState = DEFAULT;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const circuitStore = {
  get: () => state,
  set: (patch: Partial<CircuitState> | ((s: CircuitState) => Partial<CircuitState>)) => {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    emit();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset: () => {
    state = { ...DEFAULT, components: [], wires: [], junctions: [] };
    emit();
  },
};

export function useCircuitStore(): CircuitState {
  return useSyncExternalStore(circuitStore.subscribe, circuitStore.get, circuitStore.get);
}
