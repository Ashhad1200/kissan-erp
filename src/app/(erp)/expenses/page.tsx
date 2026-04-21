"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  paidVia: string;
  expenseDate: string;
  notes?: string | null;
}

const CATEGORIES = ["Salaries", "Rent", "Utilities", "Transport", "Marketing", "Miscellaneous"];
const PAID_VIA = ["Cash", "Bank Transfer", "Cheque", "Credit Card"];

const EMPTY_FORM = {
  description: "", category: "Miscellaneous", amount: "",
  paidVia: "Cash", expenseDate: new Date().toISOString().split("T")[0], notes: "",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    fetch(`/api/expenses?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setExpenses(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => toast.error("Failed to load expenses"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const handleSubmit = async () => {
    if (!form.description || !form.amount) return toast.error("Description and amount are required");
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          category: form.category,
          amount: parseFloat(form.amount),
          paidVia: form.paidVia,
          expenseDate: form.expenseDate,
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      toast.success("Expense recorded");
      setOpen(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{expenses.length} records</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Expense
        </Button>
        <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <Label>Description *</Label>
                <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What was this expense for?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category *</Label>
                  <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring/50">
                    {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Amount (PKR) *</Label>
                  <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Paid Via</Label>
                  <select value={form.paidVia} onChange={(e) => setForm((p) => ({ ...p, paidVia: e.target.value }))}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-ring/50">
                    {PAID_VIA.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Date *</Label>
                  <Input type="date" value={form.expenseDate} onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? "Saving..." : "Add Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Date range:</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none" />
            <span className="text-gray-400">—</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none" />
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                Clear
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Paid Via</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-12">No expenses found</TableCell>
                  </TableRow>
                ) : (
                  expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm text-gray-500">{formatDate(e.expenseDate)}</TableCell>
                      <TableCell className="font-medium">{e.description}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                          {e.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">{e.paidVia}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {expenses.length > 0 && (
          <div className="border-t px-4 py-3 flex justify-between items-center bg-gray-50 rounded-b-xl">
            <span className="text-sm text-gray-500">{expenses.length} expense records</span>
            <div className="text-right">
              <span className="text-sm text-gray-500 mr-2">Total:</span>
              <span className="text-base font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
