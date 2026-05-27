import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";

// ── New context providers ────────────────────────────────────────────────────
import { BleProvider } from "@/contexts/BleContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import AppLayout from "./components/AppLayout";
import SplashScreen from "./pages/SplashScreen";
import DeviceConnection from "./pages/DeviceConnection";
import Dashboard from "./pages/Dashboard";
import LearnIndex from "./pages/LearnIndex";
import ComponentDetail from "./pages/ComponentDetail";
import CircuitBuilder from "./pages/CircuitBuilder";
import ValidationScreen from "./pages/ValidationScreen";
import HistoryScreen from "./pages/HistoryScreen";
import SettingsScreen from "./pages/SettingsScreen";
import ComparisonScreen from "./pages/ComparisonScreen";
import CheatSheet from "./pages/CheatSheet";
import NotFound from "./pages/NotFound";

// ── New auth pages ───────────────────────────────────────────────────────────
import LoginScreen from "./pages/LoginScreen";
import RegisterScreen from "./pages/RegisterScreen";

const queryClient = new QueryClient();

// ── Route guard ──────────────────────────────────────────────────────────────
// Redirects unauthenticated users to /login before they reach the main app.

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── Router ───────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/login"  element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Protected — everything inside AppLayout requires login */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/"                element={<Dashboard />} />
        <Route path="/connect"         element={<DeviceConnection />} />
        <Route path="/learn"           element={<LearnIndex />} />
        <Route path="/learn/:slug"     element={<ComponentDetail />} />
        <Route path="/circuit-builder" element={<CircuitBuilder />} />
        <Route path="/validation"      element={<ValidationScreen />} />
        <Route path="/history"         element={<HistoryScreen />} />
        <Route path="/settings"        element={<SettingsScreen />} />
        <Route path="/comparison"      element={<ComparisonScreen />} />
        <Route path="/cheatsheet"      element={<CheatSheet />} />
        {/* Legacy redirects */}
        <Route path="/calculator" element={<Navigate to="/learn" replace />} />
        <Route path="/reference"  element={<Navigate to="/learn" replace />} />
        <Route path="/graph"      element={<Navigate to="/" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
//
// Provider order matters:
//   QueryClientProvider  — react-query cache
//   ThemeProvider        — dark/light mode
//   AuthProvider         — JWT state (no BLE dependency)
//   BleProvider          — BLE connection (lives above router → never unmounts)
//   BrowserRouter        — routing
//
// BleProvider is intentionally above BrowserRouter so the BLE hook instance
// is created once and never destroyed when the route changes.

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BleProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </BleProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
