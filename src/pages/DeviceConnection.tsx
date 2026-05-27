// ============================================================================
// DeviceConnection — real BLE connection page
//
// Web Bluetooth works by showing the browser's native device-picker when the
// user clicks a button. There is no way to scan and list devices yourself —
// the picker IS the scan UI. So this page:
//
//   1. Shows clear instructions and a prominent "Connect" button
//   2. On click, calls ble.connect() which triggers the browser picker
//   3. While connecting, shows a spinner
//   4. On success, shows a "Connected" confirmation and navigates home
//   5. If already connected, shows the current status with a disconnect option
// ============================================================================

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bluetooth, BluetoothOff, BluetoothSearching,
  CheckCircle2, Loader2, ArrowLeft, Zap, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBle } from "@/contexts/BleContext";

const DeviceConnection = () => {
  const ble      = useBle();
  const navigate = useNavigate();

  // Auto-navigate home once connected
  useEffect(() => {
    if (ble.connected) {
      const t = setTimeout(() => navigate("/"), 1200);
      return () => clearTimeout(t);
    }
  }, [ble.connected, navigate]);

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col px-4 pt-10 pb-6">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 self-start rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back</span>
      </button>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <BluetoothSearching className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Connect Device</h1>
        <p className="text-sm text-muted-foreground">
          Pair your Smart LCR Meter over Bluetooth
        </p>
      </motion.div>

      {/* ── Not supported ── */}
      {!ble.bleSupported && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <BluetoothOff className="h-8 w-8 text-destructive mx-auto mb-3 opacity-70" />
          <p className="text-sm font-semibold text-destructive mb-2">
            Web Bluetooth not supported
          </p>
          <p className="text-xs text-muted-foreground">
            Use <strong>Chrome</strong> or <strong>Edge</strong> on desktop or Android.
            Safari and Firefox do not support Web Bluetooth.
          </p>
        </motion.div>
      )}

      {/* ── Already connected ── */}
      <AnimatePresence>
        {ble.bleSupported && ble.connected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-inductor/40 bg-inductor/5 p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 className="h-10 w-10 text-inductor mx-auto mb-3" />
            </motion.div>
            <p className="text-sm font-semibold text-inductor mb-1">Connected!</p>
            <p className="text-xs text-muted-foreground mb-5">
              Your Smart LCR Meter is ready. Taking you to the dashboard…
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate("/")}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => ble.disconnect()}
                className="w-full rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all"
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Not connected ── */}
      {ble.bleSupported && !ble.connected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          {/* How it works card */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              How to connect
            </p>
            <div className="space-y-3">
              {[
                { icon: Zap,              text: "Power on your Smart LCR Meter" },
                { icon: BluetoothSearching, text: "Tap the button below — your browser will show a device picker" },
                { icon: Bluetooth,        text: "Select your HM-10 module from the list" },
                { icon: CheckCircle2,     text: "Connection is maintained across all pages" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 mt-0.5">
                    <Icon className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Browser compatibility note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-mosfet/20 bg-mosfet/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-mosfet mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Web Bluetooth requires <strong className="text-foreground">Chrome or Edge</strong> on desktop or Android.
              The device picker is controlled by your browser — not this app.
            </p>
          </div>

          {/* Connect button — ble.connect() MUST be called from a user click */}
          <button
            onClick={() => void ble.connect()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <Bluetooth className="h-5 w-5" />
            Connect to Smart LCR Meter
          </button>

          <p className="text-center text-[10px] text-muted-foreground/60">
            A browser device-picker will open. Select your HM-10 module to pair.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default DeviceConnection;
