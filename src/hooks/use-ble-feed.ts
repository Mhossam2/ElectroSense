import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentKey } from "@/data/components";

const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const CHAR_UUID    = "0000ffe1-0000-1000-8000-00805f9b34fb";

// ── Pin-order helpers ────────────────────────────────────────────────────────

/**
 * Parsed representation of the firmware's pinOrder field.
 *
 * The firmware emits two formats:
 *   3-pin semis:  "123=BCE"   → probeMap = { "1":"B", "2":"C", "3":"E" }
 *   2-pin diode:  "1=A 2=K"  → probeMap = { "1":"A", "2":"K" }
 *
 * `ordered` is the pin designators in physical probe order (1→2→3 / 1→2).
 * `raw` is the original firmware string for debug / display.
 */
export interface ParsedPinOrder {
  /** Map from physical probe number (as string) to pin designator */
  probeMap: Record<string, string>;
  /** Pin designators sorted by physical probe number, e.g. ["B","C","E"] */
  ordered: string[];
  /** Original firmware string */
  raw: string;
}

/**
 * Parse the firmware pinOrder string into a structured form.
 *
 * Handles:
 *   "123=BCE"   → probeMap { "1":"B", "2":"C", "3":"E" }
 *   "1=A 2=K"   → probeMap { "1":"A", "2":"K" }
 *   null / ""   → null
 */
export function parsePinOrder(raw: string | null | undefined): ParsedPinOrder | null {
  if (!raw) return null;

  const probeMap: Record<string, string> = {};

  // Format A: "123=BCE"  (all probe numbers then all designators)
  const compactMatch = raw.match(/^(\d+)=([A-Za-z0-9]+)$/);
  if (compactMatch) {
    const probes = compactMatch[1].split("");    // ["1","2","3"]
    const desigs  = compactMatch[2].split("");  // ["B","C","E"]
    probes.forEach((p, i) => {
      if (desigs[i]) probeMap[p] = desigs[i];
    });
  } else {
    // Format B: "1=A 2=K"  or "1=MT1 2=MT2" (space-separated pairs)
    const pairs = raw.split(/\s+/);
    for (const pair of pairs) {
      const m = pair.match(/^(\d+)=([A-Za-z0-9]+)$/);
      if (m) probeMap[m[1]] = m[2];
    }
  }

  if (Object.keys(probeMap).length === 0) return null;

  // Sort by probe number to get a consistent ordered array
  const ordered = Object.keys(probeMap)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => probeMap[k]);

  return { probeMap, ordered, raw };
}

// ── BLE payload types ────────────────────────────────────────────────────────

export interface BleReadPayload {
  detected: ComponentKey | null;
  /** Raw string values from firmware, keyed by parameter name.
   *  Values may contain SI prefixes, e.g. { r: "10.0k", c: "47.2u" }  */
  values: Record<string, string> | null;
  /** Parsed pin order (structured) */
  pinOrder: ParsedPinOrder | null;
  /** Raw pinOrder string as received (for backwards-compat display) */
  pinOrderRaw: string | null;
  signalFrequency?: number | null;
  externalVoltage?: number | null;
  timestamp: number;
}

const DISCONNECTED_STATE: BleReadPayload = {
  detected: null,
  values: null,
  pinOrder: null,
  pinOrderRaw: null,
  signalFrequency: null,
  externalVoltage: null,
  timestamp: 0,
};

/** Shape the firmware actually sends over BLE. */
interface FirmwarePayload {
  detected: string | null;
  values: Record<string, string> | null;
  /** e.g. "123=BCE" or "1=A 2=K" */
  pinOrder?: string | null;
  signalFrequency?: number | null;
  externalVoltage?: number | null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBleFeed(opts: { paused?: boolean } = {}): BleReadPayload & {
  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  bleSupported: boolean;
} {
  const [payload, setPayload]     = useState<BleReadPayload>(DISCONNECTED_STATE);
  const [connected, setConnected] = useState(false);

  const bleSupported = typeof navigator !== "undefined" && "bluetooth" in navigator;
  const deviceRef    = useRef<BluetoothDevice | null>(null);
  const bufferRef    = useRef<string>("");
  const pausedRef    = useRef<boolean>(!!opts.paused);

  useEffect(() => { pausedRef.current = !!opts.paused; }, [opts.paused]);

  const handleNotification = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value || pausedRef.current) return;

    // 1. Decode bytes and accumulate into the line buffer.
    const chunk = new TextDecoder().decode(value);
    console.log("📡 Raw Chunk Received:", chunk);
    bufferRef.current += chunk;

    // 2. Process complete lines (\n or \r\n).
    if (!bufferRef.current.includes("\n") && !bufferRef.current.includes("\r")) return;

    const lines = bufferRef.current.split(/\r?\n/);
    bufferRef.current = lines.pop() ?? "";

    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (!cleanLine.startsWith("{")) return;

      console.log("✅ FULL JSON PAYLOAD:", cleanLine);

      try {
        const parsed = JSON.parse(cleanLine) as FirmwarePayload;

        // ── Detect SCR vs Triac ──────────────────────────────────────────
        const rawDetected = parsed.detected;
        let detected: ComponentKey | null = null;

        if (rawDetected === "thyristor") {
          detected = (parsed.values?.type === "Triac" ? "triac" : "thyristor") as ComponentKey;
        } else if (rawDetected !== null && rawDetected !== undefined) {
          detected = rawDetected as ComponentKey;
        }

        // ── Parse pin order ──────────────────────────────────────────────
        const pinOrderRaw = parsed.pinOrder ?? null;
        const pinOrder = parsePinOrder(pinOrderRaw);

        setPayload({
          detected,
          values: parsed.values ?? null,
          pinOrder,
          pinOrderRaw,
          signalFrequency: parsed.signalFrequency ?? null,
          externalVoltage: parsed.externalVoltage ?? null,
          timestamp: Date.now(),
        });
      } catch {
        console.warn("❌ JSON Parse Error:", cleanLine);
      }
    });
  }, []);

  const connect = useCallback(async () => {
    if (!bleSupported) { console.warn("[BLE] Not supported"); return; }
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID],
      });
      deviceRef.current = device;

      const server = await device.gatt!.connect();

      let service: BluetoothRemoteGATTService;
      try {
        service = await server.getPrimaryService(SERVICE_UUID);
      } catch {
        console.error("[BLE] HM-10 service not found — is firmware running?");
        server.disconnect();
        return;
      }

      const char = await service.getCharacteristic(CHAR_UUID);
      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", handleNotification);

      bufferRef.current = "";
      setConnected(true);

      device.addEventListener("gattserverdisconnected", () => {
        bufferRef.current = "";
        setConnected(false);
        setPayload(DISCONNECTED_STATE);
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "NotFoundError")        console.warn("[BLE] No device selected.");
        else if (err.name === "NotAllowedError") console.warn("[BLE] Permission denied.");
        else                                     console.error("[BLE] Connection failed:", err.message);
      }
    }
  }, [bleSupported, handleNotification]);

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect();
  }, []);

  useEffect(() => {
    if (!connected) setPayload(DISCONNECTED_STATE);
  }, [connected]);

  return { ...payload, connect, disconnect, connected, bleSupported };
}