import { NavLink, useLocation } from "react-router-dom";
import { Activity, Bluetooth, BookOpen, Cpu, Settings } from "lucide-react";

const tabs = [
  { path: "/connect", icon: Bluetooth, label: "Connect" },
  { path: "/", icon: Activity, label: "Measure" },
  { path: "/circuit-builder", icon: Cpu, label: "Circuit" },
  { path: "/learn", icon: BookOpen, label: "Learn" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="shrink-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="flex items-center justify-around px-2 py-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path ||
            (path === "/learn" && location.pathname.startsWith("/learn"));
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_6px_hsl(200,100%,50%)]" : ""}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
