import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        payments: true,
      },
    });
    if (!order) return apiError("Sale order not found", 404);

    return apiSuccess({
      ...order,
      subTotal: Number(order.subTotal),
      discount: Number(order.discount),
      total: Number(order.total),
      paidAmount: Number(order.paidAmount),
      items: order.items.map((i) => ({
        ...i,
        qty: Number(i.qty),
        unitPrice: Number(i.unitPrice),
        unitCost: Number(i.unitCost),
        discount: Number(i.discount),
        total: Number(i.total),
      })),
      payments: order.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch sale order", 500);
  }
});

export const PUT = withAuth(async (req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { status, notes } = body;

    const order = await prisma.saleOrder.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    return apiSuccess({
      ...order,
      subTotal: Number(order.subTotal),
      discount: Number(order.discount),
      total: Number(order.total),
      paidAmount: Number(order.paidAmount),
    });
  } catch (err: any) {
    if (err?.code === "P2025") return apiError("Sale order not found", 404);
    console.error(err);
    return apiError("Failed to update sale order", 500);
  }
});
