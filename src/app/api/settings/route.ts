import { withAuth, apiSuccess, apiError } from "@/lib/api";

// In-memory settings store (persists per process restart).
// For production, store in DB or a settings table.
let appSettings = {
  storeName: "KissanMall",
  storeEmail: "info@kissanmall.pk",
  storePhone: "0300-0000000",
  storeAddress: "Lahore, Pakistan",
  currency: "PKR",
  taxRate: 0,
  shopifyDomain: process.env.SHOPIFY_STORE_DOMAIN ?? "",
  shopifyToken: process.env.SHOPIFY_ACCESS_TOKEN ? "••••••••" : "",
  shopifySyncEnabled: false,
};

export const GET = withAuth(async () => {
  return apiSuccess(appSettings);
});

export const PUT = withAuth(async (req: Request) => {
  try {
    const body = await req.json();
    appSettings = { ...appSettings, ...body };
    return apiSuccess(appSettings);
  } catch (err) {
    console.error(err);
    return apiError("Failed to update settings", 500);
  }
});

// Alias POST → PUT for flexibility
export const POST = PUT;
