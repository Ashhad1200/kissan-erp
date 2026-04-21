import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) return apiError("Product not found", 404);

    const stockAgg = await prisma.stockMovement.aggregate({
      where: { productId: id },
      _sum: { qty: true },
    });

    return apiSuccess({
      ...product,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      currentStock: Number(stockAgg._sum.qty ?? 0),
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch product", 500);
  }
});

export const PUT = withAuth(async (req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { name, sku, description, unit, costPrice, salePrice, reorderLevel, reorderQty, categoryId, active } = body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(costPrice !== undefined && { costPrice }),
        ...(salePrice !== undefined && { salePrice }),
        ...(reorderLevel !== undefined && { reorderLevel }),
        ...(reorderQty !== undefined && { reorderQty }),
        ...(categoryId !== undefined && { categoryId }),
        ...(active !== undefined && { active }),
      },
      include: { category: true },
    });

    return apiSuccess(product);
  } catch (err: any) {
    if (err?.code === "P2025") return apiError("Product not found", 404);
    if (err?.code === "P2002") return apiError("SKU already exists");
    console.error(err);
    return apiError("Failed to update product", 500);
  }
});

export const DELETE = withAuth(async (_req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    await prisma.product.update({ where: { id }, data: { active: false } });
    return apiSuccess({ message: "Product deactivated" });
  } catch (err: any) {
    if (err?.code === "P2025") return apiError("Product not found", 404);
    console.error(err);
    return apiError("Failed to delete product", 500);
  }
});
