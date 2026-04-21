"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, generateOrderNumber } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  stock: number;
}

interface LineItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
}

const EMPTY_LINE: LineItem = { productId: "", productName: "", qty: 1, unitPrice: 0, discount: 0 };
const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER"];

export default function NewSalePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [orderDiscount, setOrderDiscount] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([c, p]) => {
      setCustomers(Array.isArray(c) ? c : (c.data ?? []));
      setProducts(Array.isArray(p) ? p : (p.data ?? []));
    }).catch(() => toast.error("Failed to load data"));
  }, []);

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const updateLine = (i: number, key: keyof LineItem, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev];
      if (key === "productId") {
        const product = products.find((p) => p.id === value);
        updated[i] = {
          ...updated[i],
          productId: value as string,
          productName: product?.name ?? "",
          unitPrice: product?.salePrice ?? updated[i].unitPrice,
        };
      } else if (key === "qty" || key === "unitPrice" || key === "discount") {
        updated[i] = { ...updated[i], [key]: Number(value) };
      }
      return updated;
    });
  };

  const lineTotal = (l: LineItem) => l.qty * l.unitPrice - l.discount;
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const discountAmt = parseFloat(orderDiscount) || 0;
  const total = subtotal - discountAmt;
  const paid = parseFloat(amountPaid) || 0;
  const change = paid - total;

  const handleSubmit = async () => {
    const validLines = lines.filter((l) => l.productId && l.qty > 0);
    if (validLines.length === 0) return toast.error("Add at least one item");
    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: generateOrderNumber("SO"),
          channel: "PHYSICAL",
          customerId: customerId || undefined,
          customerName: !customerId && walkInName ? walkInName : undefined,
          paymentMethod,
          amountPaid: paid,
          notes,
          discount: discountAmt,
          items: validLines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            unitPrice: l.unitPrice,
            discount: l.discount,
            total: lineTotal(l),
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      toast.success("Sale completed successfully!");
      router.push("/sales");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to complete sale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/sales">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a physical store sale</p>
        </div>
      </div>

      {/* Customer */}
      <Card>
        <CardHeader><CardTitle className="text-base">Customer (Optional)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Existing Customer</Label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="">Walk-in / Anonymous</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
              ))}
            </select>
          </div>
          {!customerId && (
            <div className="space-y-1">
              <Label>Walk-in Name</Label>
              <Input value={walkInName} onChange={(e) => setWalkInName(e.target.value)} placeholder="e.g. Ahmed Khan (optional)" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Product</TableHead>
                <TableHead className="text-right w-[12%]">Qty</TableHead>
                <TableHead className="text-right w-[18%]">Unit Price</TableHead>
                <TableHead className="text-right w-[15%]">Disc.</TableHead>
                <TableHead className="text-right w-[15%]">Total</TableHead>
                <TableHead className="w-[5%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(i, "productId", e.target.value)}
                      className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring/50"
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.salePrice)} (Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={1} value={line.qty} onChange={(e) => updateLine(i, "qty", e.target.value)} className="text-right h-8" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} step="0.01" value={line.unitPrice} onChange={(e) => updateLine(i, "unitPrice", e.target.value)} className="text-right h-8" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} value={line.discount} onChange={(e) => updateLine(i, "discount", e.target.value)} className="text-right h-8" />
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(lineTotal(line))}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Method</Label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      paymentMethod === m ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
                    }`}
                  >
                    {m.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Order notes…" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span className="text-gray-500 shrink-0">Order Discount</span>
              <Input type="number" min={0} value={orderDiscount} onChange={(e) => setOrderDiscount(e.target.value)} className="w-32 text-right h-8" />
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-green-700">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span className="text-gray-500 shrink-0">Amount Paid</span>
              <Input type="number" min={0} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-32 text-right h-8" />
            </div>
            {paid >= total && (
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-500">Change</span>
                <span className="text-green-700">{formatCurrency(change)}</span>
              </div>
            )}
            <Button onClick={handleSubmit} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 mt-2">
              {saving ? "Processing…" : "Complete Sale"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
