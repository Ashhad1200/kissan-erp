import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const channel = searchParams.get("channel") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50")));

    const where: any = { status: { not: "CANCELLED" } };
    if (channel) where.channel = channel;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.orderDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
      };
    }

    const [orders, total, agg] = await Promise.all([
      prisma.saleOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { orderDate: "desc" },
      }),
      prisma.saleOrder.count({ where }),
      prisma.saleOrder.aggregate({ where, _sum: { total: true, discount: true }, _avg: { total: true } }),
    ]);

    const totalRevenue = Number(agg._sum.total ?? 0);
    const totalOrders = total;
    const avgOrderValue = totalOrders > 0 ? Number(agg._avg.total ?? 0) : 0;

    return apiSuccess({
      data: orders.map((o) => ({
        ...o,
        subTotal: Number(o.subTotal),
        discount: Number(o.discount),
        total: Number(o.total),
        paidAmount: Number(o.paidAmount),
        items: o.items.map((i) => ({
          ...i,
          qty: Number(i.qty),
          unitPrice: Number(i.unitPrice),
          unitCost: Number(i.unitCost),
          discount: Number(i.discount),
          total: Number(i.total),
        })),
      })),
      total,
      page,
      pageSize,
      summary: { totalRevenue, totalOrders, avgOrderValue },
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to generate sales report", 500);
  }
});
