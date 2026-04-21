import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";
import { auth } from "@/lib/auth";

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const channel = searchParams.get("channel") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const where: any = {};
    if (channel) where.channel = channel;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.orderDate = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
      };
    }

    const [orders, total] = await Promise.all([
      prisma.saleOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          _count: { select: { items: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.saleOrder.count({ where }),
    ]);

    return apiSuccess({
      data: orders.map((o) => ({
        ...o,
        subTotal: Number(o.subTotal),
        discount: Number(o.discount),
        total: Number(o.total),
        paidAmount: Number(o.paidAmount),
      })),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch sale orders", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const session = await auth();
    const body = await req.json();
    const { customerId, items, notes, discount = 0, paymentMethod, paidAmount = 0 } = body;

    if (!Array.isArray(items) || items.length === 0) return apiError("items are required");

    // Validate products exist
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });
    if (products.length !== productIds.length) return apiError("One or more products not found");

    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderNumber = `SO-${Date.now().toString().slice(-9)}`;

    const subTotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.qty) * Number(item.unitPrice),
      0
    );
    const total = subTotal - Number(discount);

    const order = await prisma.$transaction(async (tx) => {
      const saleOrder = await tx.saleOrder.create({
        data: {
          orderNumber,
          channel: "PHYSICAL",
          customerId: customerId ?? null,
          status: "COMPLETED",
          notes: notes ?? null,
          subTotal,
          discount: Number(discount),
          total,
          paidAmount: Number(paidAmount),
          items: {
            create: items.map((item: any) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                qty: Number(item.qty),
                unitPrice: Number(item.unitPrice),
                unitCost: Number(product.costPrice),
                discount: Number(item.discount ?? 0),
                total: Number(item.qty) * Number(item.unitPrice) - Number(item.discount ?? 0),
              };
            }),
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });

      // Create stock movements for each item
      for (const item of items) {
        const agg = await tx.stockMovement.aggregate({
          where: { productId: item.productId },
          _sum: { qty: true },
        });
        const currentBalance = Number(agg._sum.qty ?? 0);
        const newBalance = currentBalance - Number(item.qty);

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "SALE",
            qty: -Number(item.qty),
            balanceQty: newBalance,
            unitCost: Number(productMap.get(item.productId)!.costPrice),
            reference: orderNumber,
            notes: `Sale ${orderNumber}`,
            createdBy: session?.user?.id ?? null,
          },
        });
      }

      // Create payment record if paid
      if (Number(paidAmount) > 0 && paymentMethod) {
        await tx.payment.create({
          data: {
            type: "SALE_RECEIPT",
            method: paymentMethod,
            amount: Number(paidAmount),
            saleOrderId: saleOrder.id,
            createdBy: session?.user?.id ?? null,
          },
        });
      }

      return saleOrder;
    });

    return apiSuccess(
      {
        ...order,
        subTotal: Number(order.subTotal),
        discount: Number(order.discount),
        total: Number(order.total),
        paidAmount: Number(order.paidAmount),
      },
      201
    );
  } catch (err) {
    console.error(err);
    return apiError("Failed to create sale order", 500);
  }
});
