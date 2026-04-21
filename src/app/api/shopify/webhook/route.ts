import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function verifyShopifyHmac(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;
  const computed = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader));
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shopifyId = req.headers.get("x-shopify-order-id") ?? undefined;

  // Verify HMAC signature
  if (!verifyShopifyHmac(rawBody, hmacHeader)) {
    await prisma.shopifySyncLog.create({
      data: { event: topic, shopifyId, status: "error", error: "Invalid HMAC signature" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Respond 200 immediately and process async
  (async () => {
    try {
      if (topic === "orders/create") {
        await handleOrderCreate(payload);
        await prisma.shopifySyncLog.create({
          data: { event: topic, shopifyId: String(payload.id), status: "success", payload },
        });
      } else if (topic === "orders/cancelled") {
        await handleOrderCancelled(payload);
        await prisma.shopifySyncLog.create({
          data: { event: topic, shopifyId: String(payload.id), status: "success", payload },
        });
      } else {
        await prisma.shopifySyncLog.create({
          data: { event: topic, shopifyId: shopifyId ? String(shopifyId) : null, status: "success", payload },
        });
      }
    } catch (err: any) {
      console.error("Shopify webhook processing error:", err);
      await prisma.shopifySyncLog.create({
        data: {
          event: topic,
          shopifyId: shopifyId ? String(shopifyId) : null,
          status: "error",
          payload,
          error: err?.message ?? "Unknown error",
        },
      }).catch(console.error);
    }
  })();

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleOrderCreate(order: any) {
  const shopifyOrderId = String(order.id);

  // Idempotency check
  const existing = await prisma.saleOrder.findUnique({ where: { shopifyOrderId } });
  if (existing) return;

  // Find or create customer
  let customerId: string | null = null;
  if (order.customer?.id) {
    const shopifyCustId = String(order.customer.id);
    let customer = await prisma.customer.findUnique({ where: { shopifyId: shopifyCustId } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: `${order.customer.first_name ?? ""} ${order.customer.last_name ?? ""}`.trim() || "Shopify Customer",
          phone: order.customer.phone ?? null,
          email: order.customer.email ?? null,
          shopifyId: shopifyCustId,
        },
      });
    }
    customerId = customer.id;
  }

  const orderNumber = `SO-${Date.now().toString().slice(-9)}`;
  const lineItems: any[] = order.line_items ?? [];

  const subTotal = Number(order.subtotal_price ?? 0);
  const total = Number(order.total_price ?? 0);
  const discount = Number(order.total_discounts ?? 0);

  await prisma.$transaction(async (tx) => {
    const saleOrder = await tx.saleOrder.create({
      data: {
        orderNumber,
        channel: "SHOPIFY",
        shopifyOrderId,
        customerId,
        status: "COMPLETED",
        subTotal,
        discount,
        total,
        paidAmount: total,
        notes: `Shopify order #${order.order_number}`,
        items: {
          create: await Promise.all(
            lineItems.map(async (item: any) => {
              const product = item.variant_id
                ? await tx.product.findUnique({ where: { shopifyVariantId: String(item.variant_id) } })
                : null;
              return {
                productId: product?.id ?? (await getOrCreatePlaceholderProduct(tx, item)).id,
                qty: Number(item.quantity ?? 1),
                unitPrice: Number(item.price ?? 0),
                unitCost: Number(product?.costPrice ?? 0),
                discount: 0,
                total: Number(item.price ?? 0) * Number(item.quantity ?? 1),
              };
            })
          ),
        },
      },
      include: { items: true },
    });

    // Stock movements for each item
    for (const saleItem of saleOrder.items) {
      const agg = await tx.stockMovement.aggregate({
        where: { productId: saleItem.productId },
        _sum: { qty: true },
      });
      const currentBalance = Number(agg._sum.qty ?? 0);
      const newBalance = currentBalance - Number(saleItem.qty);

      await tx.stockMovement.create({
        data: {
          productId: saleItem.productId,
          type: "SALE",
          qty: -Number(saleItem.qty),
          balanceQty: newBalance,
          unitCost: Number(saleItem.unitCost),
          reference: orderNumber,
          notes: `Shopify order #${order.order_number}`,
        },
      });
    }
  });
}

async function handleOrderCancelled(order: any) {
  const shopifyOrderId = String(order.id);
  const saleOrder = await prisma.saleOrder.findUnique({
    where: { shopifyOrderId },
    include: { items: true },
  });
  if (!saleOrder || saleOrder.status === "CANCELLED") return;

  await prisma.$transaction(async (tx) => {
    await tx.saleOrder.update({ where: { id: saleOrder.id }, data: { status: "CANCELLED" } });

    // Reverse stock movements
    for (const item of saleOrder.items) {
      const agg = await tx.stockMovement.aggregate({
        where: { productId: item.productId },
        _sum: { qty: true },
      });
      const currentBalance = Number(agg._sum.qty ?? 0);
      const returnQty = Number(item.qty);
      const newBalance = currentBalance + returnQty;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "RETURN_IN",
          qty: returnQty,
          balanceQty: newBalance,
          unitCost: Number(item.unitCost),
          reference: saleOrder.orderNumber,
          notes: `Cancelled Shopify order #${order.order_number}`,
        },
      });
    }
  });
}

async function getOrCreatePlaceholderProduct(tx: any, lineItem: any) {
  const sku = `SHOPIFY-${lineItem.sku || lineItem.variant_id || lineItem.id}`;
  const existing = await tx.product.findUnique({ where: { sku } });
  if (existing) return existing;

  return tx.product.create({
    data: {
      name: lineItem.title ?? "Unknown Shopify Product",
      sku,
      shopifyVariantId: lineItem.variant_id ? String(lineItem.variant_id) : null,
      salePrice: Number(lineItem.price ?? 0),
    },
  });
}
