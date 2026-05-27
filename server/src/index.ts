import express from "express";
import cors from "cors";
import authRoutes         from "./routes/auth.js";
import circuitRoutes      from "./routes/circuits.js";
import measurementRoutes  from "./routes/measurements.js";

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api/auth",         authRoutes);
app.use("/api/circuits",     circuitRoutes);
app.use("/api/measurements", measurementRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
