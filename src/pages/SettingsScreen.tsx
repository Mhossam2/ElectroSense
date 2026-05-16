import { motion } from "framer-motion";
import { 
  Radio, ToggleLeft, Crosshair, Palette, Download, Ruler,
  ChevronRight, Sun, Moon, Monitor
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const SettingsScreen = () => {
  const { theme, setTheme } = useTheme();

  const themeLabel = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <div className="px-4 pt-8 pb-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your measurement preferences</p>
      </motion.div>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pt-2 pb-1">Measurement</p>
        
        <SettingCard icon={Radio} label="Test Frequency" value="1 kHz" hasChevron />
        <SettingCard icon={ToggleLeft} label="Measurement Mode" value="Auto Detect" hasChevron />
        <SettingCard icon={Ruler} label="Units Preference" value="Auto Scale" hasChevron />

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pt-4 pb-1">Device</p>

        <SettingCard icon={Crosshair} label="Calibration Wizard" value="Last: 2 days ago" hasChevron accent />
        <SettingCard icon={Download} label="Firmware Update" value="v2.1.3 (Latest)" hasChevron />

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pt-4 pb-1">Appearance</p>

        {/* Theme selector */}
        <div className="rounded-xl border border-border bg-card p-4 card-glow">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
              <Palette className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Currently: {themeLabel}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "dark" as const, label: "Dark", icon: Moon },
              { value: "light" as const, label: "Light", icon: Sun },
              { value: "system" as const, label: "System", icon: Monitor },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-all ${
                  theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">Smart LCR Lab v1.0.0</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">© 2026 Smart LCR Lab</p>
        </div>
      </div>
    </div>
  );
};

const SettingCard = ({ icon: Icon, label, value, hasChevron, accent }: {
  icon: any; label: string; value: string; hasChevron?: boolean; accent?: boolean;
}) => (
  <button className={`flex w-full items-center gap-3 rounded-xl border p-4 transition-all active:scale-[0.98] ${
    accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"
  } card-glow`}>
    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
      accent ? "bg-primary/20" : "bg-secondary"
    }`}>
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
    </div>
    <div className="flex-1 text-left">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{value}</p>
    </div>
    {hasChevron && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
  </button>
);

export default SettingsScreen;
