import { useState } from "react";
import { motion } from "framer-motion";
import { Bluetooth, BluetoothSearching, Wifi, Battery, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Device {
  id: string;
  name: string;
  rssi: number;
  connected: boolean;
}

const mockDevices: Device[] = [
  { id: "1", name: "Smart LCR Meter v2.1", rssi: -42, connected: false },
  { id: "2", name: "LCR-ESP32-0A3F", rssi: -67, connected: false },
  { id: "3", name: "Lab Meter Pro", rssi: -81, connected: false },
];

const getRssiLabel = (rssi: number) => {
  if (rssi > -50) return { label: "Excellent", bars: 4 };
  if (rssi > -65) return { label: "Good", bars: 3 };
  if (rssi > -75) return { label: "Fair", bars: 2 };
  return { label: "Weak", bars: 1 };
};

const SignalBars = ({ bars }: { bars: number }) => (
  <div className="flex items-end gap-0.5">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className={`w-1 rounded-full transition-colors ${
          i <= bars ? "bg-primary" : "bg-border"
        }`}
        style={{ height: `${6 + i * 3}px` }}
      />
    ))}
  </div>
);

const DeviceConnection = () => {
  const [scanning, setScanning] = useState(false);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  const handleConnect = (id: string) => {
    setConnecting(id);
    setTimeout(() => {
      setConnecting(null);
      setConnectedId(id);
      setTimeout(() => navigate("/"), 800);
    }, 1500);
  };

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <BluetoothSearching className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Device Connection</h1>
        </div>
        <p className="text-sm text-muted-foreground">Find and connect to your Smart LCR Meter</p>
      </motion.div>

      {/* Scan button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        onClick={handleScan}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-all hover:bg-primary/20 active:scale-[0.98]"
      >
        <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
        {scanning ? "Scanning..." : "Scan for Devices"}
      </motion.button>

      {/* Devices list */}
      <div className="space-y-3">
        {mockDevices.map((device, i) => {
          const signal = getRssiLabel(device.rssi);
          const isConnected = connectedId === device.id;
          const isConnecting = connecting === device.id;
          return (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className={`rounded-xl border p-4 transition-all card-glow ${
                isConnected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isConnected ? "bg-primary/20" : "bg-secondary"
                  }`}>
                    <Bluetooth className={`h-5 w-5 ${isConnected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{device.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SignalBars bars={signal.bars} />
                      <span className="text-xs text-muted-foreground">{signal.label} ({device.rssi} dBm)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(device.id)}
                  disabled={isConnecting || isConnected}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                    isConnected
                      ? "bg-primary/20 text-primary"
                      : isConnecting
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                  }`}
                >
                  {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Connect"}
                </button>
              </div>

              {isConnected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-3 flex items-center gap-4 border-t border-border pt-3"
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Battery className="h-3.5 w-3.5 text-inductor" />
                    <span>87%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wifi className="h-3.5 w-3.5 text-primary" />
                    <span>BLE 5.0</span>
                  </div>
                  <span className="text-xs text-muted-foreground">FW v2.1.3</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DeviceConnection;
