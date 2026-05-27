// ============================================================================
// BleContext — keeps the BLE connection alive across page navigation.
//
// Previously, useBleFeed() was called inside individual page components
// (Dashboard, CircuitBuilder). When the user navigated away those components
// unmounted and the BLE device disconnected.
//
// Solution: call useBleFeed() once here, above the Router, so it never
// unmounts. All pages call useBle() to get the shared instance.
// ============================================================================

import { createContext, useContext, useState, type ReactNode } from "react";
import { useBleFeed } from "@/hooks/use-ble-feed";
import type { BleReadPayload } from "@/hooks/use-ble-feed";

// ── Types ────────────────────────────────────────────────────────────────────

type BleContextValue = BleReadPayload & {
  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  bleSupported: boolean;
  /** Controls whether the live feed is paused (e.g. while in generate mode) */
  paused: boolean;
  setPaused: (paused: boolean) => void;
};

// ── Context ──────────────────────────────────────────────────────────────────

const BleContext = createContext<BleContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function BleProvider({ children }: { children: ReactNode }) {
  // paused is controlled by individual pages (e.g. Dashboard pauses when in
  // generate mode, CircuitBuilder pauses when build-assist is closed).
  const [paused, setPaused] = useState(false);

  const ble = useBleFeed({ paused });

  return (
    <BleContext.Provider value={{ ...ble, paused, setPaused }}>
      {children}
    </BleContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Use this instead of useBleFeed() in every page/component.
 * Returns the same shared BLE connection that persists across navigation.
 */
export function useBle(): BleContextValue {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error("useBle() must be used inside <BleProvider>");
  return ctx;
}
