import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const productId = searchParams.get("productId") ?? undefined;

    const where: any = {};
    if (productId) where.productId = productId;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    // Current stock per product (all active products)
    const stockAggs = await prisma.stockMovement.groupBy({
      by: ["productId"],
      _sum: { qty: true },
    });

    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, sku: true, unit: true, reorderLevel: true, costPrice: true },
      orderBy: { name: "asc" },
    });

    const stockMap = new Map(stockAggs.map((s) => [s.productId, Number(s._sum.qty ?? 0)]));
    const stockSummary = products.map((p) => ({
      ...p,
      costPrice: Number(p.costPrice),
      currentStock: stockMap.get(p.id) ?? 0,
    }));

    return apiSuccess({
      movements: movements.map((m) => ({
        ...m,
        qty: Number(m.qty),
        balanceQty: Number(m.balanceQty),
        unitCost: Number(m.unitCost),
      })),
      total,
      page,
      pageSize,
      stockSummary,
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch inventory", 500);
  }
});
