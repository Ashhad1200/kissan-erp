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
        { contactPerson: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: { _count: { select: { purchaseOrders: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.supplier.count({ where }),
    ]);

    return apiSuccess({
      data: suppliers.map((s) => ({ ...s, balance: Number(s.balance) })),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch suppliers", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const { name, contactPerson, phone, email, address, city, paymentTerms } = body;
    if (!name) return apiError("name is required");

    const supplier = await prisma.supplier.create({
      data: { name, contactPerson, phone, email, address, city, paymentTerms },
    });
    return apiSuccess(supplier, 201);
  } catch (err) {
    console.error(err);
    return apiError("Failed to create supplier", 500);
  }
});
