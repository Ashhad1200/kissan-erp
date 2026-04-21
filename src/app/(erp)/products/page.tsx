"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, AlertCircle } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  reorderLevel: number;
  reorderQty: number;
  category?: { id: string; name: string } | null;
  status?: string;
}

const EMPTY_FORM = {
  name: "", sku: "", description: "", unit: "PCS",
  costPrice: "", salePrice: "", categoryId: "",
  reorderLevel: "10", reorderQty: "50",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, sku: p.sku, description: p.description ?? "",
      unit: p.unit, costPrice: String(p.costPrice), salePrice: String(p.salePrice),
      categoryId: p.category?.id ?? "",
      reorderLevel: String(p.reorderLevel), reorderQty: String(p.reorderQty),
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.sku) return toast.error("Name and SKU are required");
    setSaving(true);
    try {
      const url = editId ? `/api/products/${editId}` : "/api/products";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, sku: form.sku, description: form.description,
          unit: form.unit, categoryId: form.categoryId || undefined,
          costPrice: parseFloat(form.costPrice) || 0,
          salePrice: parseFloat(form.salePrice) || 0,
          reorderLevel: parseInt(form.reorderLevel) || 0,
          reorderQty: parseInt(form.reorderQty) || 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      toast.success(editId ? "Product updated" : "Product added");
      setOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Product deleted");
      load();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} products in catalogue</p>
        </div>
        <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
        <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={f("name")} placeholder="Product name" />
                </div>
                <div className="space-y-1">
                  <Label>SKU *</Label>
                  <Input value={form.sku} onChange={f("sku")} placeholder="SKU-001" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={f("description")} rows={2} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Unit</Label>
                  <Input value={form.unit} onChange={f("unit")} placeholder="PCS / KG / L" />
                </div>
                <div className="space-y-1">
                  <Label>Category ID</Label>
                  <Input value={form.categoryId} onChange={f("categoryId")} placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cost Price (PKR)</Label>
                  <Input type="number" min={0} value={form.costPrice} onChange={f("costPrice")} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label>Sale Price (PKR)</Label>
                  <Input type="number" min={0} value={form.salePrice} onChange={f("salePrice")} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Reorder Level</Label>
                  <Input type="number" min={0} value={form.reorderLevel} onChange={f("reorderLevel")} placeholder="10" />
                </div>
                <div className="space-y-1">
                  <Label>Reorder Qty</Label>
                  <Input type="number" min={0} value={form.reorderQty} onChange={f("reorderQty")} placeholder="50" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? "Saving…" : editId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU…" className="pl-9" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-12">No products found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const lowStock = p.currentStock <= p.reorderLevel;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{p.sku}</TableCell>
                        <TableCell>{p.category?.name ?? <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.costPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.salePrice)}</TableCell>
                        <TableCell className="text-right">
                          <span className={lowStock ? "text-red-600 font-semibold" : "text-gray-700"}>
                            {p.currentStock}
                          </span>
                          {lowStock && <AlertCircle className="inline h-3 w-3 text-red-500 ml-1" />}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${lowStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {lowStock ? "Low Stock" : "In Stock"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
