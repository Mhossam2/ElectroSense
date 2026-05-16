import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDebugConsole } from "@/lib/ble-debug";

// Initialize debug console commands (for development)
initDebugConsole();

createRoot(document.getElementById("root")!).render(<App />);
