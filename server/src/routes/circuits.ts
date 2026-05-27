import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

// All circuit routes require authentication
router.use(requireAuth);

// ── GET /api/circuits — list all circuits for the current user ───────────────

router.get("/", async (req: AuthRequest, res) => {
  const circuits = await prisma.circuit.findMany({
    where:   { userId: req.userId! },
    orderBy: { updatedAt: "desc" },
    select:  { id: true, name: true, createdAt: true, updatedAt: true },
  });
  res.json(circuits);
});

// ── GET /api/circuits/:id — get one circuit (with full JSON) ─────────────────

router.get("/:id", async (req: AuthRequest, res) => {
  const circuit = await prisma.circuit.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!circuit) { res.status(404).json({ message: "Circuit not found" }); return; }

  res.json({
    ...circuit,
    components: JSON.parse(circuit.components),
    wires:      JSON.parse(circuit.wires),
    junctions:  JSON.parse(circuit.junctions),
  });
});

// ── POST /api/circuits — create a new circuit ────────────────────────────────

router.post("/", async (req: AuthRequest, res) => {
  const { name, components, wires, junctions } = req.body as {
    name?: string;
    components?: unknown;
    wires?: unknown;
    junctions?: unknown;
  };

  // Enforce unique name per user — append a counter if a duplicate exists
  let finalName = name ?? "Untitled circuit";
  const existing = await prisma.circuit.findMany({
    where: { userId: req.userId!, name: { startsWith: finalName } },
    select: { name: true },
  });
  if (existing.length > 0) {
    const usedNames = new Set(existing.map(c => c.name));
    if (usedNames.has(finalName)) {
      let counter = 2;
      while (usedNames.has(`${finalName} (${counter})`)) counter++;
      finalName = `${finalName} (${counter})`;
    }
  }

  const circuit = await prisma.circuit.create({
    data: {
      userId:     req.userId!,
      name:       finalName,
      components: JSON.stringify(components ?? []),
      wires:      JSON.stringify(wires ?? []),
      junctions:  JSON.stringify(junctions ?? []),
    },
  });

  res.status(201).json({
    ...circuit,
    components: JSON.parse(circuit.components),
    wires:      JSON.parse(circuit.wires),
    junctions:  JSON.parse(circuit.junctions),
  });
});

// ── PUT /api/circuits/:id — update an existing circuit ───────────────────────

router.put("/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.circuit.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) { res.status(404).json({ message: "Circuit not found" }); return; }

  const { name, components, wires, junctions } = req.body as {
    name?: string;
    components?: unknown;
    wires?: unknown;
    junctions?: unknown;
  };

  const circuit = await prisma.circuit.update({
    where: { id: req.params.id },
    data: {
      ...(name       !== undefined && { name }),
      ...(components !== undefined && { components: JSON.stringify(components) }),
      ...(wires      !== undefined && { wires:      JSON.stringify(wires) }),
      ...(junctions  !== undefined && { junctions:  JSON.stringify(junctions) }),
    },
  });

  res.json({
    ...circuit,
    components: JSON.parse(circuit.components),
    wires:      JSON.parse(circuit.wires),
    junctions:  JSON.parse(circuit.junctions),
  });
});

// ── DELETE /api/circuits/:id ─────────────────────────────────────────────────

router.delete("/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.circuit.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) { res.status(404).json({ message: "Circuit not found" }); return; }

  await prisma.circuit.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
