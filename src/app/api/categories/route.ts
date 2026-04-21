import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (_req: Request) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return apiSuccess(categories);
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch categories", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const { name } = body;
    if (!name) return apiError("name is required");

    const category = await prisma.category.create({ data: { name } });
    return apiSuccess(category, 201);
  } catch (err: any) {
    if (err?.code === "P2002") return apiError("Category name already exists");
    console.error(err);
    return apiError("Failed to create category", 500);
  }
});
