/**
 * BLE Debug & Test Utilities
 *
 * For development: Simulate hardware data without a physical device.
 * Inject mock component measurements into the app via browser console.
 *
 * NOTE: Mock data is automatically suppressed while a real BLE device
 * is connected. Call injectMockComponent() only when not paired to hardware.
 */

import type { ComponentKey } from "@/data/components";

export interface DebugPayload {
  detected: ComponentKey | null;
  values: Record<string, string> | null;
  pinOrder?: string | null;
  signalFrequency?: number | null;
  externalVoltage?: number | null;
}

/**
 * Mock data templates for each component type.
 * Modify values here to test different scenarios.
 */
export const DEBUG_PAYLOADS: Record<ComponentKey, DebugPayload> = {
  auto: { detected: null, values: null },

  bjt: {
    detected: "bjt",
    pinOrder: "EBC",
    values: {
      hfe:  "182",
      vbe:  "0.652",
      ice0: "12",
      ices: "3",
    },
  },

  mosfet: {
    detected: "mosfet",
    pinOrder: "GDS",
    values: {
      vth:   "2.10",
      cg:    "1850",
      rdson: "0.085",
    },
  },

  jfet: {
    detected: "jfet",
    pinOrder: "GDS",
    values: {
      vgs: "-1.42",
      id:  "4.1",
      ch:  "N",
    },
  },

  diode: {
    detected: "diode",
    pinOrder: "AK",
    values: {
      vf: "0.612",
      ir: "8",
      cj: "47",
      vz: "—",
    },
  },

  thyristor: {
    detected: "thyristor",
    pinOrder: "GAK",
    values: {
      type:    "SCR",
      trigger: "OK",
      ih:      "< 6",
    },
  },

  resistor: {
    detected: "resistor",
    values: {
      r:   "10.00",
      l:   "—",
      tol: "±1",
    },
  },

  capacitor: {
    detected: "capacitor",
    values: {
      c:     "47.20",
      esr:   "0.23",
      vloss: "0.4",
    },
  },

  inductor: {
    detected: "inductor",
    values: {
      l: "10.00",
      r: "0.45",
    },
  },

  frequency: {
    detected: "frequency",
    signalFrequency: 1000,
    values: {
      fin:  "1.000",
      fout: "1.000",
      pwm:  "50",
    },
  },

  voltage: {
    detected: "voltage",
    externalVoltage: 12.34,
    values: {
      vdc: "12.34",
      vz:  "—",
    },
  },
};

// ─── Internal state ───────────────────────────────────────────────────────────

let globalMockData: DebugPayload | null = null;

/**
 * Get the current mock data (consumed by useBleFeed every 100 ms).
 * Returns null when no mock has been injected, or after clearMockData().
 */
export function getMockData(): DebugPayload | null {
  return globalMockData;
}

/**
 * Clear any active mock data.
 * The Dashboard will stop updating and wait for real hardware.
 */
export function clearMockData(): void {
  globalMockData = null;
  console.log("[DEBUG] Mock data cleared — Dashboard will wait for real hardware.");
}

/**
 * Inject a mock component payload as if the hardware sent it over BLE.
 *
 * Usage (browser console):
 *   injectMockComponent("bjt")
 *   injectMockComponent("resistor")
 *   injectMockComponent(null)   // same as clearMockData()
 */
export function injectMockComponent(key: ComponentKey | null): void {
  if (key === null) {
    clearMockData();
    return;
  }

  const payload = DEBUG_PAYLOADS[key];
  if (!payload) {
    console.error(`[DEBUG] Unknown component key: "${key}"`);
    console.log("[DEBUG] Valid keys:", Object.keys(DEBUG_PAYLOADS).join(", "));
    return;
  }

  globalMockData = payload;
  console.log(`[DEBUG] ✓ Injected mock: ${key}`, payload);
  console.log(`[DEBUG] Dashboard should now show: ${payload.detected}`);
}

/**
 * Inject a fully custom payload for edge-case testing.
 *
 * Usage:
 *   injectCustomMockData({ detected: "resistor", values: { r: "4.7k", tol: "±5" } })
 */
export function injectCustomMockData(data: DebugPayload): void {
  if (!data.detected) {
    console.warn("[DEBUG] Payload has no 'detected' field — Dashboard may show empty state.");
  }
  globalMockData = data;
  console.log("[DEBUG] ✓ Injected custom mock data:", data);
}

/**
 * Print all available debug commands to the console.
 */
export function printDebugHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              ELECTRO-SENSE BLE DEBUG COMMANDS                  ║
╚════════════════════════════════════════════════════════════════╝

📡 INJECT MOCK COMPONENTS  (only works when NOT paired to hardware)

  injectMockComponent("bjt")         → BJT (Bipolar transistor)
  injectMockComponent("mosfet")      → N-channel MOSFET
  injectMockComponent("jfet")        → N-channel JFET
  injectMockComponent("diode")       → Diode
  injectMockComponent("thyristor")   → Thyristor / SCR
  injectMockComponent("resistor")    → Resistor (10 kΩ)
  injectMockComponent("capacitor")   → Capacitor (47 µF)
  injectMockComponent("inductor")    → Inductor (10 µH)
  injectMockComponent("frequency")   → Frequency (1 kHz)
  injectMockComponent("voltage")     → Voltage (12.34 V)
  injectMockComponent(null)          → Clear / nothing detected

🔧 CUSTOM INJECTION

  injectCustomMockData({
    detected: "resistor",
    values: { r: "4.7k", tol: "±5" }
  })

🧹 CLEANUP

  clearMockData()                    → Stop mock data feed

📚 REFERENCE

  DEBUG_PAYLOADS                     → All template payloads
  getMockData()                      → Current mock payload

⚠️  NOTE: Mock data is automatically suppressed while a real BLE
    device is connected. Connect first, then mock data is ignored.
`);
}

/**
 * Initialise debug helpers on the global window object so they are
 * accessible from the browser DevTools console.
 * Call once during app startup (e.g. main.tsx).
 */
export function initDebugConsole(): void {
  (window as any).injectMockComponent  = injectMockComponent;
  (window as any).injectCustomMockData = injectCustomMockData;
  (window as any).clearMockData        = clearMockData;
  (window as any).printDebugHelp       = printDebugHelp;
  (window as any).getMockData          = getMockData;
  (window as any).DEBUG_PAYLOADS       = DEBUG_PAYLOADS;

  console.log(
    "%c⚡ Electro-Sense Debug Mode Enabled",
    "color:#00ff00;font-weight:bold;font-size:14px;"
  );
  console.log(
    "%cType printDebugHelp() to see all available commands.",
    "color:#00ff88;font-size:12px;"
  );

  // Print help automatically 500 ms after load so it doesn't get
  // buried under framework startup noise.
  setTimeout(printDebugHelp, 500);
}