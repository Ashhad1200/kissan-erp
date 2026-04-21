"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Account {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  balance: number;
}

interface JournalEntry {
  id: string;
  entryDate: string;
  reference: string;
  description: string;
  lines: Array<{ debitAccountId?: string | null; creditAccountId?: string | null; amount: number }>;
}

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
const TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-700",
  LIABILITY: "bg-red-100 text-red-700",
  EQUITY: "bg-purple-100 text-purple-700",
  REVENUE: "bg-green-100 text-green-700",
  EXPENSE: "bg-orange-100 text-orange-700",
};

const EMPTY_JE_FORM = {
  date: new Date().toISOString().split("T")[0],
  reference: "", description: "",
  lines: [
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" },
  ],
};

export default function AccountingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [jeOpen, setJeOpen] = useState(false);
  const [jeForm, setJeForm] = useState({ ...EMPTY_JE_FORM });
  const [saving, setSaving] = useState(false);

  const loadAccounts = () => {
    fetch("/api/accounting/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setAccounts(d);
        else if (Array.isArray(d.data)) setAccounts(d.data);
        else setAccounts((Object.values(d) as Account[][]).flat());
      })
      .catch(() => toast.error("Failed to load accounts"))
      .finally(() => setLoadingAccounts(false));
  };

  const loadEntries = () => {
    fetch("/api/accounting/journal-entries")
      .then((r) => r.json())
      .then((d) => setEntries(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => toast.error("Failed to load journal entries"))
      .finally(() => setLoadingEntries(false));
  };

  useEffect(() => { loadAccounts(); loadEntries(); }, []);

  const groupedAccounts = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter((a) => a.type === type);
    return acc;
  }, {} as Record<string, Account[]>);

  const addJELine = () => setJeForm((p) => ({ ...p, lines: [...p.lines, { accountId: "", debit: "", credit: "" }] }));
  const removeJELine = (i: number) => setJeForm((p) => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));
  const updateJELine = (i: number, key: string, value: string) =>
    setJeForm((p) => { const lines = [...p.lines]; lines[i] = { ...lines[i], [key]: value }; return { ...p, lines }; });

  const totalDebit = jeForm.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = jeForm.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSaveJE = async () => {
    if (!jeForm.description) return toast.error("Description is required");
    if (!isBalanced) return toast.error("Entry must be balanced (debits = credits)");
    setSaving(true);
    try {
      const res = await fetch("/api/accounting/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: jeForm.date,
          reference: jeForm.reference,
          description: jeForm.description,
          lines: jeForm.lines
            .filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
            .map((l) => ({
              debitAccountId: parseFloat(l.debit) > 0 ? l.accountId : null,
              creditAccountId: parseFloat(l.credit) > 0 ? l.accountId : null,
              amount: parseFloat(l.debit) > 0 ? parseFloat(l.debit) : parseFloat(l.credit),
            })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      toast.success("Journal entry saved");
      setJeOpen(false);
      setJeForm({ ...EMPTY_JE_FORM });
      loadEntries();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-sm text-gray-500 mt-0.5">Chart of accounts and journal entries</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <div className="space-y-4 mt-4">
            {loadingAccounts ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
            ) : (
              ACCOUNT_TYPES.map((type) => {
                const typeAccounts = groupedAccounts[type] ?? [];
                if (typeAccounts.length === 0) return null;
                const typeTotal = typeAccounts.reduce((s, a) => s + a.balance, 0);
                return (
                  <Card key={type}>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}>{type}</span>
                        <CardTitle className="text-sm font-medium text-gray-500">{typeAccounts.length} accounts</CardTitle>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(typeTotal)}</span>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-4">Code</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead className="text-right pr-4">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {typeAccounts.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="pl-4 font-mono text-sm text-gray-500">{a.code}</TableCell>
                              <TableCell className="font-medium">{a.name}</TableCell>
                              <TableCell className="text-right pr-4">{formatCurrency(a.balance)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="journal">
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setJeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Entry
              </Button>
              <Dialog open={jeOpen} onOpenChange={(o) => setJeOpen(o)}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Date *</Label>
                        <Input type="date" value={jeForm.date} onChange={(e) => setJeForm((p) => ({ ...p, date: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Reference</Label>
                        <Input value={jeForm.reference} onChange={(e) => setJeForm((p) => ({ ...p, reference: e.target.value }))} placeholder="JV-001" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Description *</Label>
                      <Input value={jeForm.description} onChange={(e) => setJeForm((p) => ({ ...p, description: e.target.value }))} placeholder="Entry description" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Lines</Label>
                        <Button size="sm" variant="outline" onClick={addJELine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
                      </div>
                      <div className="space-y-2">
                        {jeForm.lines.map((line, i) => (
                          <div key={i} className="grid grid-cols-[1fr_100px_100px_32px] gap-2">
                            <select value={line.accountId} onChange={(e) => updateJELine(i, "accountId", e.target.value)}
                              className="border border-input rounded-md px-2 py-1.5 text-sm bg-transparent outline-none">
                              <option value="">Select account...</option>
                              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.code} — {a.name}</option>))}
                            </select>
                            <Input type="number" min={0} placeholder="Debit" value={line.debit} onChange={(e) => updateJELine(i, "debit", e.target.value)} className="text-right" />
                            <Input type="number" min={0} placeholder="Credit" value={line.credit} onChange={(e) => updateJELine(i, "credit", e.target.value)} className="text-right" />
                            <Button variant="ghost" size="sm" className="text-red-500 px-0" onClick={() => removeJELine(i)} disabled={jeForm.lines.length <= 2}>x</Button>
                          </div>
                        ))}
                        <div className="flex justify-end gap-4 text-sm pt-1">
                          <span className="text-gray-500">Debit: <strong>{formatCurrency(totalDebit)}</strong></span>
                          <span className="text-gray-500">Credit: <strong>{formatCurrency(totalCredit)}</strong></span>
                          {totalDebit > 0 && !isBalanced && <span className="text-red-500 font-medium">Not balanced</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setJeOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveJE} disabled={saving || !isBalanced} className="bg-green-600 hover:bg-green-700">
                      {saving ? "Saving..." : "Save Entry"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingEntries ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right pr-4">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-12 pl-4">No journal entries yet</TableCell>
                        </TableRow>
                      ) : (
                        entries.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="pl-4 text-sm text-gray-500">{formatDate(e.entryDate)}</TableCell>
                            <TableCell className="font-mono text-sm">{e.reference || "—"}</TableCell>
                            <TableCell className="font-medium">{e.description}</TableCell>
                            <TableCell className="text-right">{formatCurrency(e.lines.reduce((s, l) => s + (l.debitAccountId ? l.amount : 0), 0))}</TableCell>
                            <TableCell className="text-right pr-4">{formatCurrency(e.lines.reduce((s, l) => s + (l.creditAccountId ? l.amount : 0), 0))}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
