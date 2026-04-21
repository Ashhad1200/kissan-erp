import crypto from "crypto";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
const API_VERSION = "2024-01";

export async function shopifyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": ACCESS_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export function verifyShopifyWebhook(body: string, hmac: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET!;
  const digest = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

export async function getShopifyProducts() {
  return shopifyFetch<{ products: any[] }>("products.json?limit=250&fields=id,title,variants");
}

export async function updateShopifyInventory(
  inventoryItemId: string,
  locationId: string,
  available: number
) {
  return shopifyFetch("inventory_levels/set.json", {
    method: "POST",
    body: JSON.stringify({ inventory_item_id: inventoryItemId, location_id: locationId, available }),
  });
}
