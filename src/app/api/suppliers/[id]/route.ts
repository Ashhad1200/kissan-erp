import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true } },
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, poNumber: true, status: true, total: true, orderDate: true },
        },
      },
    });
    if (!supplier) return apiError("Supplier not found", 404);
    return apiSuccess({ ...supplier, balance: Number(supplier.balance) });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch supplier", 500);
  }
});

export const PUT = withAuth(async (req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { name, contactPerson, phone, email, address, city, paymentTerms, active } = body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(active !== undefined && { active }),
      },
    });
    return apiSuccess({ ...supplier, balance: Number(supplier.balance) });
  } catch (err: any) {
    if (err?.code === "P2025") return apiError("Supplier not found", 404);
    console.error(err);
    return apiError("Failed to update supplier", 500);
  }
});

export const DELETE = withAuth(async (_req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    await prisma.supplier.update({ where: { id }, data: { active: false } });
    return apiSuccess({ message: "Supplier deactivated" });
  } catch (err: any) {
    if (err?.code === "P2025") return apiError("Supplier not found", 404);
    console.error(err);
    return apiError("Failed to delete supplier", 500);
  }
});
