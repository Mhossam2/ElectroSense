import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { JWT_SECRET } from "../middleware/auth.js";

const router  = Router();
const prisma  = new PrismaClient();
const ROUNDS  = 12;

// ── POST /api/auth/register ──────────────────────────────────────────────────

router.post("/register", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, ROUNDS);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;
