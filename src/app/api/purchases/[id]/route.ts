import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
        },
        payments: true,
      },
    });
    if (!po) return apiError("Purchase order not found", 404);

    return apiSuccess({
      ...po,
      subTotal: Number(po.subTotal),
      discount: Number(po.discount),
      total: Number(po.total),
      paidAmount: Number(po.paidAmount),
      items: po.items.map((i) => ({
        ...i,
        qty: Number(i.qty),
        receivedQty: Number(i.receivedQty),
        unitCost: Number(i.unitCost),
        total: Number(i.total),
      })),
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch purchase order", 500);
  }
});

export const PUT = withAuth(async (req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { status, notes, expectedDate } = body;

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(expectedDate !== undefined && { expectedDate: expectedDate ? new Date(expectedDate) : null }),
      },
      include: { supplier: true },
    });

    return apiSuccess({
      ...po,
      subTotal: Number(po.subTotal),
      discount: Number(po.discount),
      total: Number(po.total),
      paidAmount: Number(po.paidAmount),
    });
  } catch (err: any) {
    if (err?.code === "P2025") return apiError("Purchase order not found", 404);
    console.error(err);
    return apiError("Failed to update purchase order", 500);
  }
});
