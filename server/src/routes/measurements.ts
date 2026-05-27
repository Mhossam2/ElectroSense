import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// ── GET /api/measurements ────────────────────────────────────────────────────
// Optional query params: ?type=resistor  ?circuitId=xyz

router.get("/", async (req: AuthRequest, res) => {
  const { type, circuitId } = req.query as { type?: string; circuitId?: string };

  const measurements = await prisma.measurement.findMany({
    where: {
      userId: req.userId!,
      ...(type      && { type }),
      ...(circuitId && { circuitId }),
    },
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  res.json(
    measurements.map((m) => ({
      ...m,
      values: m.values ? JSON.parse(m.values) : null,
      timestamp: m.timestamp.toISOString(),
    }))
  );
});

// ── POST /api/measurements — save a BLE reading ──────────────────────────────

router.post("/", async (req: AuthRequest, res) => {
  const { type, values, pinOrder, signalFrequency, externalVoltage, circuitId } = req.body as {
    type?: string;
    values?: Record<string, string>;
    pinOrder?: string;
    signalFrequency?: number;
    externalVoltage?: number;
    circuitId?: string;
  };

  // If a circuitId was supplied, verify it belongs to this user
  if (circuitId) {
    const circuit = await prisma.circuit.findFirst({
      where: { id: circuitId, userId: req.userId! },
    });
    if (!circuit) {
      res.status(400).json({ message: "Circuit not found" });
      return;
    }
  }

  const measurement = await prisma.measurement.create({
    data: {
      userId:          req.userId!,
      circuitId:       circuitId ?? null,
      type:            type ?? null,
      values:          values ? JSON.stringify(values) : null,
      pinOrder:        pinOrder ?? null,
      signalFrequency: signalFrequency ?? null,
      externalVoltage: externalVoltage ?? null,
    },
  });

  res.status(201).json({
    ...measurement,
    values:    measurement.values ? JSON.parse(measurement.values) : null,
    timestamp: measurement.timestamp.toISOString(),
  });
});

export default router;
