import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todaySalesAgg,
      todayOrders,
      monthSalesAgg,
      lowStockProducts,
      pendingPOs,
      totalProducts,
      totalCustomers,
      totalSuppliers,
    ] = await Promise.all([
      prisma.saleOrder.aggregate({
        where: { orderDate: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.saleOrder.count({
        where: { orderDate: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
      }),
      prisma.saleOrder.aggregate({
        where: { orderDate: { gte: monthStart }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.product.findMany({
        where: { active: true },
        select: { id: true, reorderLevel: true },
      }),
      prisma.purchaseOrder.count({
        where: { status: { in: ["ORDERED", "PARTIAL"] } },
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.customer.count({ where: { active: true } }),
      prisma.supplier.count({ where: { active: true } }),
    ]);

    // Compute low stock count using stock movements
    const stockAggs = await prisma.stockMovement.groupBy({
      by: ["productId"],
      _sum: { qty: true },
    });
    const stockMap = new Map(stockAggs.map((s) => [s.productId, Number(s._sum.qty ?? 0)]));
    const lowStockCount = lowStockProducts.filter(
      (p) => (stockMap.get(p.id) ?? 0) <= p.reorderLevel
    ).length;

    // Sales trend: last 7 days
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86400000);
    const salesLast7Days = await prisma.saleOrder.findMany({
      where: {
        orderDate: { gte: sevenDaysAgo },
        status: { not: "CANCELLED" },
      },
      select: { orderDate: true, total: true, channel: true },
    });

    const trendMap = new Map<string, { physical: number; shopify: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      trendMap.set(key, { physical: 0, shopify: 0 });
    }

    for (const sale of salesLast7Days) {
      const key = sale.orderDate.toISOString().slice(0, 10);
      const entry = trendMap.get(key);
      if (entry) {
        if (sale.channel === "PHYSICAL") {
          entry.physical += Number(sale.total);
        } else {
          entry.shopify += Number(sale.total);
        }
      }
    }

    const salesTrend = Array.from(trendMap.entries()).map(([date, v]) => ({ date, ...v }));

    return apiSuccess({
      todaySales: Number(todaySalesAgg._sum.total ?? 0),
      todayOrders,
      monthSales: Number(monthSalesAgg._sum.total ?? 0),
      lowStockCount,
      pendingPOs,
      totalProducts,
      totalCustomers,
      totalSuppliers,
      salesTrend,
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch dashboard stats", 500);
  }
});
