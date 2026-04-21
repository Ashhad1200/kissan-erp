"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Plus, Minus, ShoppingCart, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, generateOrderNumber } from "@/lib/utils";
import { SaleReceipt, type SaleReceiptData } from "@/components/print/SaleReceipt";
import { usePrint } from "@/hooks/usePrint";

interface Product {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  currentStock: number;
  category?: { name: string } | null;
}

interface CartItem {
  product: Product;
  qty: number;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank" },
];

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState("0");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Receipt dialog
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<SaleReceiptData | null>(null);
  const { ref: printRef, print: printReceipt } = usePrint("KissanMall — Receipt");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    p.currentStock > 0 &&
    (!search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.currentStock) { toast.error("Not enough stock"); return prev; }
        return prev.map((c) => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.product.id === productId ? { ...c, qty: c.qty + delta } : c).filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((c) => c.product.id !== productId));

  const subtotal = cart.reduce((sum, c) => sum + c.qty * c.product.salePrice, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);

  const completeSale = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setCompleting(true);
    const orderNumber = generateOrderNumber("SO");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          channel: "PHYSICAL",
          customerName: customerName || undefined,
          paymentMethod,
          amountPaid: total,
          discount: discountAmt,
          items: cart.map((c) => ({
            productId: c.product.id,
            qty: c.qty,
            unitPrice: c.product.salePrice,
            discount: 0,
            total: c.qty * c.product.salePrice,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");

      // Build receipt before clearing cart
      const receipt: SaleReceiptData = {
        orderNumber,
        date: new Date().toISOString(),
        channel: "PHYSICAL",
        customerName: customerName || undefined,
        items: cart.map((c) => ({
          name: c.product.name,
          sku: c.product.sku,
          qty: c.qty,
          unitPrice: c.product.salePrice,
          total: c.qty * c.product.salePrice,
        })),
        subtotal,
        discount: discountAmt > 0 ? discountAmt : undefined,
        total,
        paidAmount: total,
        paymentMethod,
        variant: "thermal",
      };
      setLastReceipt(receipt);
      setReceiptOpen(true);

      setCart([]);
      setCustomerName("");
      setDiscount("0");
      toast.success(`Sale of ${formatCurrency(total)} completed!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to complete sale");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <>
    <div className="flex h-[calc(100vh-88px)] gap-0 -m-6 p-0">
      {/* LEFT: Product Grid */}
      <div className="flex flex-col flex-1 bg-gray-50 border-r overflow-hidden">
        <div className="p-4 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="pl-9 h-10"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id)?.qty ?? 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="bg-white rounded-xl p-3 text-left border border-gray-200 hover:border-green-400 hover:shadow-md transition-all active:scale-95 relative"
                  >
                    {inCart > 0 && (
                      <span className="absolute top-2 right-2 h-5 w-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {inCart}
                      </span>
                    )}
                    <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center mb-2 text-2xl">🌿</div>
                    <p className="font-medium text-sm leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{p.sku}</p>
                    <p className="text-green-700 font-bold text-sm mt-1">{formatCurrency(p.salePrice)}</p>
                    <p className="text-xs text-gray-400">Stock: {p.currentStock}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="flex flex-col w-80 bg-white border-l">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            Cart
            {cart.length > 0 && <span className="text-sm font-normal text-gray-500">({cart.reduce((s, c) => s + c.qty, 0)} items)</span>}
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">Clear</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
              <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Click a product to add</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.product.id} className="p-3 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.product.salePrice)} x {item.qty}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="h-6 w-6 rounded-full border flex items-center justify-center hover:bg-gray-50 text-gray-600">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} disabled={item.qty >= item.product.currentStock} className="h-6 w-6 rounded-full border flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-40">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-green-700">{formatCurrency(item.qty * item.product.salePrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Customer Name (optional)</label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in..." className="h-8 mt-1 text-sm" />
          </div>
          <div className="flex gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${paymentMethod === m.value ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium shrink-0">Discount (PKR)</label>
            <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-8 text-right text-sm" />
          </div>
          <Separator />
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount</span><span>-{formatCurrency(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span><span className="text-green-700">{formatCurrency(total)}</span>
            </div>
          </div>
          <Button onClick={completeSale} disabled={completing || cart.length === 0} className="w-full h-12 text-base bg-green-600 hover:bg-green-700 font-bold">
            {completing ? "Processing..." : `Complete Sale — ${formatCurrency(total)}`}
          </Button>
        </div>
      </div>
      </div>

      {/* ── Receipt Dialog ── */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm p-0 gap-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="text-base font-semibold">
              ✅ Sale Complete — Receipt
            </DialogTitle>
          </DialogHeader>

          {lastReceipt && (
            <>
              {/* Hidden element captured by usePrint */}
              <div ref={printRef} style={{ display: "none" }}>
                <SaleReceipt {...lastReceipt} variant="thermal" />
              </div>

              {/* Visible preview */}
              <div className="overflow-y-auto max-h-[60vh] bg-gray-50 px-6 py-4 font-mono text-xs leading-relaxed">
                <div className="text-center font-bold text-base text-green-700 mb-0.5">🌿 KissanMall</div>
                <div className="text-center text-gray-500 mb-1">kissanmall.pk</div>
                <div className="text-center font-bold text-sm">{lastReceipt.orderNumber}</div>
                <div className="text-center text-gray-500 mb-2">
                  {new Date(lastReceipt.date).toLocaleString("en-PK")}
                </div>
                {lastReceipt.customerName && (
                  <div className="text-center text-gray-600 mb-2">
                    Customer: {lastReceipt.customerName}
                  </div>
                )}
                <div className="border-t border-dashed border-gray-300 my-2" />
                <div className="flex justify-between text-gray-400 text-xs mb-1">
                  <span>Item</span><span>Qty</span><span>Amt</span>
                </div>
                {lastReceipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between gap-2 py-0.5">
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="text-gray-500">×{item.qty}</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-gray-300 my-2" />
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>{formatCurrency(lastReceipt.subtotal)}</span>
                </div>
                {(lastReceipt.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span><span>-{formatCurrency(lastReceipt.discount!)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-1">
                  <span>TOTAL</span>
                  <span className="text-green-700">{formatCurrency(lastReceipt.total)}</span>
                </div>
                {lastReceipt.paymentMethod && (
                  <div className="text-center mt-3">
                    <span className="bg-green-100 text-green-700 rounded-full px-3 py-0.5 text-xs font-semibold">
                      {lastReceipt.paymentMethod}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed border-gray-300 mt-3 pt-2 text-center text-gray-500">
                  Thank you for shopping with us!
                </div>
              </div>
            </>
          )}

          <DialogFooter className="p-3 gap-2 flex-row border-t">
            <Button variant="outline" className="flex-1" onClick={() => setReceiptOpen(false)}>
              Close
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={printReceipt}
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
