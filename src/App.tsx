import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/splash" element={<SplashScreen />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/connect" element={<DeviceConnection />} />
              <Route path="/learn" element={<LearnIndex />} />
              <Route path="/learn/:slug" element={<ComponentDetail />} />
              <Route path="/circuit-builder" element={<CircuitBuilder />} />
              <Route path="/validation" element={<ValidationScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/comparison" element={<ComparisonScreen />} />
              <Route path="/cheatsheet" element={<CheatSheet />} />
              {/* Legacy redirects — Calculator & Reference now live inside each component lesson */}
              <Route path="/calculator" element={<Navigate to="/learn" replace />} />
              <Route path="/reference" element={<Navigate to="/learn" replace />} />
              <Route path="/graph" element={<Navigate to="/" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
