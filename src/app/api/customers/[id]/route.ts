import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            orderDate: true,
            channel: true,
          },
        },
      },
    });
    if (!customer) return apiError("Customer not found", 404);

    return apiSuccess({
      ...customer,
      balance: Number(customer.balance),
      orders: customer.orders.map((o) => ({ ...o, total: Number(o.total) })),
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch customer", 500);
  }
});

export const PUT = withAuth(async (req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { name, phone, email, address, city, active } = body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(active !== undefined && { active }),
      },
    });
    return apiSuccess({ ...customer, balance: Number(customer.balance) });
  } catch (err: any) {
    if (err?.code === "P2025") return apiError("Customer not found", 404);
    console.error(err);
    return apiError("Failed to update customer", 500);
  }
});

export const DELETE = withAuth(async (_req: Request, ctx: any) => {
  try {
    const { id } = await ctx.params;
    await prisma.customer.update({ where: { id }, data: { active: false } });
    return apiSuccess({ message: "Customer deactivated" });
  } catch (err: any) {
    if (err?.code === "P2025") return apiError("Customer not found", 404);
    console.error(err);
    return apiError("Failed to delete customer", 500);
  }
});
