import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    // Group by type
    const grouped = accounts.reduce((acc: Record<string, any[]>, account) => {
      const type = account.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push({ ...account, balance: Number(account.balance) });
      return acc;
    }, {});

    return apiSuccess(grouped);
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch accounts", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const { code, name, type, parentId } = body;
    if (!code || !name || !type) return apiError("code, name, and type are required");

    const account = await prisma.account.create({
      data: { code, name, type, parentId: parentId ?? null },
    });
    return apiSuccess(account, 201);
  } catch (err: any) {
    if (err?.code === "P2002") return apiError("Account code already exists");
    console.error(err);
    return apiError("Failed to create account", 500);
  }
});
