import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";
import { auth } from "@/lib/auth";

export const POST = withAuth(async (req: Request) => {
  try {
    const session = await auth();
    const body = await req.json();
    const { productId, qty, notes } = body;

    if (!productId) return apiError("productId is required");
    if (qty === undefined || qty === null) return apiError("qty is required");

    const product = await prisma.product.findUnique({ where: { id: productId, active: true } });
    if (!product) return apiError("Product not found", 404);

    const result = await prisma.$transaction(async (tx) => {
      // Compute current balance
      const agg = await tx.stockMovement.aggregate({
        where: { productId },
        _sum: { qty: true },
      });
      const currentBalance = Number(agg._sum.qty ?? 0);
      const newBalance = currentBalance + Number(qty);

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: "ADJUSTMENT",
          qty,
          balanceQty: newBalance,
          unitCost: product.costPrice,
          notes: notes ?? null,
          createdBy: session?.user?.id ?? null,
        },
      });

      return { movement, newBalance };
    });

    return apiSuccess({
      movement: {
        ...result.movement,
        qty: Number(result.movement.qty),
        balanceQty: Number(result.movement.balanceQty),
        unitCost: Number(result.movement.unitCost),
      },
      product: {
        ...product,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        currentStock: result.newBalance,
      },
    }, 201);
  } catch (err) {
    console.error(err);
    return apiError("Failed to create adjustment", 500);
  }
});
