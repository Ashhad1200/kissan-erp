import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";
import bcrypt from "bcryptjs";

export const GET = withAuth(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return apiSuccess(users);
}, ["ADMIN", "MANAGER"]);

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const { name, email, password, role } = body;
  if (!name || !email || !password) return apiError("Name, email, and password are required");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return apiError("Email already registered");

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role ?? "STAFF" },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return apiSuccess(user, 201);
}, ["ADMIN"]);
