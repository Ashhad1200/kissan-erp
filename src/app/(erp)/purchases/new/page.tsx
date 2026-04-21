"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
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

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
}

interface LineItem {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
}

const EMPTY_LINE: LineItem = { productId: "", productName: "", qty: 1, unitCost: 0 };

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([s, p]) => {
      setSuppliers(Array.isArray(s) ? s : (s.data ?? []));
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
          unitCost: product?.costPrice ?? updated[i].unitCost,
        };
      } else if (key === "qty" || key === "unitCost") {
        updated[i] = { ...updated[i], [key]: Number(value) };
      } else {
        updated[i] = { ...updated[i], [key as string]: value } as LineItem;
      }
      return updated;
    });
  };

  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = subtotal - discountAmt;

  const handleSubmit = async (status: "DRAFT" | "ORDERED") => {
    if (!supplierId) return toast.error("Please select a supplier");
    const validLines = lines.filter((l) => l.productId && l.qty > 0);
    if (validLines.length === 0) return toast.error("Add at least one item");

    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: generateOrderNumber("PO"),
          supplierId,
          orderDate,
          expectedDate: expectedDate || undefined,
          notes,
          discount: discountAmt,
          status,
          items: validLines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            unitCost: l.unitCost,
            totalCost: l.qty * l.unitCost,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data = await res.json();
      toast.success("Purchase order created");
      router.push(`/purchases/${data.id ?? ""}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create PO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/purchases">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a purchase order for a supplier</p>
        </div>
      </div>

      {/* Header Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-1">
            <Label>Supplier *</Label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring/50"
            >
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Order Date *</Label>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Expected Delivery</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Product</TableHead>
                <TableHead className="w-[15%] text-right">Qty</TableHead>
                <TableHead className="w-[20%] text-right">Unit Cost (PKR)</TableHead>
                <TableHead className="w-[20%] text-right">Total</TableHead>
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
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={1}
                      value={line.qty}
                      onChange={(e) => updateLine(i, "qty", e.target.value)}
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number" min={0} step="0.01"
                      value={line.unitCost}
                      onChange={(e) => updateLine(i, "unitCost", e.target.value)}
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(line.qty * line.unitCost)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeLine(i)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or instructions…"
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span className="text-gray-500 shrink-0">Discount (PKR)</span>
              <Input
                type="number" min={0}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-36 text-right"
              />
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-green-700">{formatCurrency(total)}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleSubmit("DRAFT")}
                disabled={saving}
              >
                Save as Draft
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleSubmit("ORDERED")}
                disabled={saving}
              >
                {saving ? "Submitting…" : "Place Order"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
