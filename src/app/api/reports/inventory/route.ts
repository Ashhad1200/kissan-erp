import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });

    const productIds = products.map((p) => p.id);
    const stockAggs = await prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _sum: { qty: true },
    });
    const stockMap = new Map(stockAggs.map((s) => [s.productId, Number(s._sum.qty ?? 0)]));

    const report = products.map((p) => {
      const currentStock = stockMap.get(p.id) ?? 0;
      const costPrice = Number(p.costPrice);
      const salePrice = Number(p.salePrice);
      const stockValue = currentStock * costPrice;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        category: p.category,
        costPrice,
        salePrice,
        reorderLevel: p.reorderLevel,
        currentStock,
        stockValue,
        isLowStock: currentStock <= p.reorderLevel,
      };
    });

    const totalStockValue = report.reduce((sum, p) => sum + p.stockValue, 0);
    const lowStockCount = report.filter((p) => p.isLowStock).length;

    return apiSuccess({ products: report, totalStockValue, lowStockCount, totalProducts: report.length });
  } catch (err) {
    console.error(err);
    return apiError("Failed to generate inventory report", 500);
  }
});
