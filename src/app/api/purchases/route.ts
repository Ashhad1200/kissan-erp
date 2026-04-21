import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const status = searchParams.get("status") ?? undefined;
    const supplierId = searchParams.get("supplierId") ?? undefined;

    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.purchaseOrder.count({ where }),
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
    return apiError("Failed to fetch purchase orders", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const { supplierId, items, notes, expectedDate, discount = 0 } = body;

    if (!supplierId) return apiError("supplierId is required");
    if (!Array.isArray(items) || items.length === 0) return apiError("items are required");

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return apiError("Supplier not found", 404);

    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Calculate totals
    const subTotal = items.reduce((sum: number, item: any) => sum + Number(item.qty) * Number(item.unitCost), 0);
    const total = subTotal - Number(discount);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        status: "DRAFT",
        notes: notes ?? null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subTotal,
        discount: Number(discount),
        total,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            qty: Number(item.qty),
            unitCost: Number(item.unitCost),
            total: Number(item.qty) * Number(item.unitCost),
          })),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });

    return apiSuccess(po, 201);
  } catch (err) {
    console.error(err);
    return apiError("Failed to create purchase order", 500);
  }
});
