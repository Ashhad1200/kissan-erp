import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const search = searchParams.get("search") ?? "";

    const where: any = { active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { orders: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.customer.count({ where }),
    ]);

    return apiSuccess({
      data: customers.map((c) => ({ ...c, balance: Number(c.balance) })),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch customers", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const { name, phone, email, address, city, shopifyId } = body;
    if (!name) return apiError("name is required");

    const customer = await prisma.customer.create({
      data: { name, phone, email, address, city, shopifyId: shopifyId ?? null },
    });
    return apiSuccess(customer, 201);
  } catch (err: any) {
    if (err?.code === "P2002") return apiError("Customer with this Shopify ID already exists");
    console.error(err);
    return apiError("Failed to create customer", 500);
  }
});
