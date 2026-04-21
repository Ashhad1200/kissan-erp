import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, apiError, apiSuccess } from "@/lib/api";

export const POST = withAuth(async (_req: Request) => {
  try {
    // Stub: full implementation requires Shopify API credentials
    // When credentials are available, this will:
    // 1. Fetch products/inventory from Shopify Admin API
    // 2. Compare with local stock movements
    // 3. Create ADJUSTMENT movements for discrepancies
    // 4. Update shopifyId/shopifyVariantId on products

    const hasCredentials =
      !!process.env.SHOPIFY_SHOP_DOMAIN &&
      !!process.env.SHOPIFY_ACCESS_TOKEN;

    if (!hasCredentials) {
      await prisma.shopifySyncLog.create({
        data: {
          event: "manual_sync",
          status: "error",
          error: "Shopify credentials not configured. Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN.",
        },
      });
      return apiError(
        "Shopify credentials not configured. Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN in environment variables.",
        503
      );
    }

    // Log the sync attempt
    await prisma.shopifySyncLog.create({
      data: {
        event: "manual_sync",
        status: "success",
        payload: { message: "Sync initiated - stub implementation" },
      },
    });

    return apiSuccess({ message: "Sync initiated. Full implementation pending Shopify credentials." });
  } catch (err) {
    console.error(err);
    return apiError("Failed to initiate sync", 500);
  }
});
