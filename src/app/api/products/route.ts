import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const search = searchParams.get("search") ?? "";
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const lowStock = searchParams.get("lowStock") === "true";

    const where: any = { active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ]);

    // Compute current stock for each product
    const productIds = products.map((p) => p.id);
    const stockAggs = await prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _sum: { qty: true },
    });
    const stockMap = new Map(stockAggs.map((s) => [s.productId, Number(s._sum.qty ?? 0)]));

    let result = products.map((p) => ({
      ...p,
      costPrice: Number(p.costPrice),
      salePrice: Number(p.salePrice),
      currentStock: stockMap.get(p.id) ?? 0,
    }));

    if (lowStock) {
      result = result.filter((p) => p.currentStock <= p.reorderLevel);
    }

    return apiSuccess({ data: result, total: lowStock ? result.length : total, page, pageSize });
  } catch (err) {
    console.error(err);
    return apiError("Failed to fetch products", 500);
  }
});

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    const { name, sku, description, unit, costPrice, salePrice, reorderLevel, reorderQty, categoryId, shopifyId, shopifyVariantId } = body;

    if (!name || !sku) return apiError("name and sku are required");

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        description,
        unit: unit ?? "pcs",
        costPrice: costPrice ?? 0,
        salePrice: salePrice ?? 0,
        reorderLevel: reorderLevel ?? 10,
        reorderQty: reorderQty ?? 50,
        categoryId: categoryId ?? null,
        shopifyId: shopifyId ?? null,
        shopifyVariantId: shopifyVariantId ?? null,
      },
      include: { category: true },
    });

    return apiSuccess(product, 201);
  } catch (err: any) {
    if (err?.code === "P2002") return apiError("SKU already exists");
    console.error(err);
    return apiError("Failed to create product", 500);
  }
});
