import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";
import { auth } from "@/lib/auth";

export const POST = withAuth(async (req: Request, ctx: any) => {
  try {
    const session = await auth();
    const { id } = await ctx.params;
    const body = await req.json();
    const { items } = body; // [{ poItemId, receivedQty }]

    if (!Array.isArray(items) || items.length === 0) return apiError("items are required");

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, supplier: true },
    });
    if (!po) return apiError("Purchase order not found", 404);
    if (po.status === "CANCELLED") return apiError("Cannot receive a cancelled PO");
    if (po.status === "RECEIVED") return apiError("PO already fully received");

    const result = await prisma.$transaction(async (tx) => {
      for (const receiveItem of items) {
        const { poItemId, receivedQty } = receiveItem;
        const poItem = po.items.find((i) => i.id === poItemId);
        if (!poItem) continue;

        const newReceivedQty = Number(poItem.receivedQty) + Number(receivedQty);
        await tx.pOItem.update({
          where: { id: poItemId },
          data: { receivedQty: newReceivedQty },
        });

        // Compute current stock balance
        const agg = await tx.stockMovement.aggregate({
          where: { productId: poItem.productId },
          _sum: { qty: true },
        });
        const currentBalance = Number(agg._sum.qty ?? 0);
        const newBalance = currentBalance + Number(receivedQty);

        await tx.stockMovement.create({
          data: {
            productId: poItem.productId,
            type: "PURCHASE",
            qty: Number(receivedQty),
            balanceQty: newBalance,
            unitCost: poItem.unitCost,
            reference: po.poNumber,
            notes: `GRN for PO ${po.poNumber}`,
            createdBy: session?.user?.id ?? null,
          },
        });
      }

      // Determine new PO status
      const updatedItems = await tx.pOItem.findMany({ where: { purchaseOrderId: id } });
      const allReceived = updatedItems.every((i) => Number(i.receivedQty) >= Number(i.qty));
      const anyReceived = updatedItems.some((i) => Number(i.receivedQty) > 0);
      const newStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : po.status;

      // Update PO status and supplier AP balance if not paid
      const unpaidAmount = Number(po.total) - Number(po.paidAmount);
      const [updatedPO] = await Promise.all([
        tx.purchaseOrder.update({
          where: { id },
          data: { status: newStatus },
          include: { items: { include: { product: true } }, supplier: true },
        }),
        unpaidAmount > 0 && newStatus === "RECEIVED"
          ? tx.supplier.update({
              where: { id: po.supplierId },
              data: { balance: { increment: unpaidAmount } },
            })
          : Promise.resolve(null),
      ]);

      return updatedPO;
    });

    return apiSuccess({
      ...result,
      subTotal: Number(result.subTotal),
      discount: Number(result.discount),
      total: Number(result.total),
      paidAmount: Number(result.paidAmount),
      items: result.items.map((i) => ({
        ...i,
        qty: Number(i.qty),
        receivedQty: Number(i.receivedQty),
        unitCost: Number(i.unitCost),
        total: Number(i.total),
      })),
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to receive stock", 500);
  }
});
