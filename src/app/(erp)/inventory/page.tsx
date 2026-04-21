"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";

type MovementType = "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN_IN" | "RETURN_OUT" | "OPENING";

interface StockMovement {
  id: string;
  createdAt: string;
  type: MovementType;
  qty: number;
  balanceAfter: number;
  reference?: string | null;
  notes?: string | null;
  product: { id: string; name: string; sku: string } | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
}

const TYPE_COLOR: Record<MovementType, string> = {
  PURCHASE: "bg-green-100 text-green-700",
  RETURN_IN: "bg-green-100 text-green-700",
  OPENING: "bg-green-100 text-green-700",
  SALE: "bg-red-100 text-red-700",
  RETURN_OUT: "bg-red-100 text-red-700",
  ADJUSTMENT: "bg-yellow-100 text-yellow-700",
};

const EMPTY_FORM = {
  productId: "", type: "ADJUSTMENT" as MovementType, qty: "", notes: "",
};

export default function InventoryPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([inv, prods]) => {
        setMovements(Array.isArray(inv) ? inv : (inv.data ?? []));
        setProducts(Array.isArray(prods) ? prods : (prods.data ?? []));
      })
      .catch(() => toast.error("Failed to load inventory"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = movements.filter((m) =>
    !search ||
    m.product?.name.toLowerCase().includes(search.toLowerCase()) ||
    m.product?.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = async () => {
    if (!form.productId || !form.qty) return toast.error("Product and quantity are required");
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          type: form.type,
          qty: parseFloat(form.qty),
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      toast.success("Stock adjusted successfully");
      setOpen(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  };

  const qtyDisplay = (type: MovementType, qty: number) => {
    const positive = ["PURCHASE", "RETURN_IN", "OPENING"].includes(type);
    const prefix = positive ? "+" : "-";
    return (
      <span className={positive ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
        {prefix}{Math.abs(qty)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stock movement history</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adjust Stock
        </Button>
        <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <Label>Product *</Label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="">Select product…</option>
                  {products.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pr.name} ({pr.sku}) — Stock: {pr.currentStock}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Adjustment Type *</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as MovementType }))}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="ADJUSTMENT">Adjustment (add/remove)</option>
                  <option value="OPENING">Opening Balance</option>
                  <option value="RETURN_IN">Return In</option>
                  <option value="RETURN_OUT">Return Out</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Quantity * (use negative to remove stock)</Label>
                <Input
                  type="number"
                  value={form.qty}
                  onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))}
                  placeholder="e.g. 10 or -5"
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Reason for adjustment…"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleAdjust} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? "Saving…" : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by product name or SKU…" className="pl-9" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                      No stock movements found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-gray-500 text-xs">{formatDate(m.createdAt)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{m.product?.name ?? "—"}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.product?.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[m.type]}`}>
                          {m.type.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{qtyDisplay(m.type, m.qty)}</TableCell>
                      <TableCell className="text-right font-medium">{m.balanceAfter}</TableCell>
                      <TableCell className="text-xs text-gray-500 font-mono">{m.reference ?? "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">{m.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
