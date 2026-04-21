"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, DollarSign, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { PurchaseOrderDoc } from "@/components/print/PurchaseOrderDoc";
import { usePrint } from "@/hooks/usePrint";

interface POItem {
  id: string;
  product: { name: string; sku: string } | null;
  qty: number;
  receivedQty: number;
  unitCost: number;
  total: number;
}

interface Payment {
  id: string;
  amount: number;
  createdAt: string;
  method: string;
  notes?: string | null;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { name: string; phone?: string | null; contactPerson?: string | null } | null;
  orderDate: string;
  expectedDate?: string | null;
  status: string;
  notes?: string | null;
  total: number;
  paidAmount: number;
  items: POItem[];
  payments: Payment[];
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const { ref: printRef, print: printPO } = usePrint("KissanMall — Purchase Order");

  // Receive sheet state
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);

  // Payment sheet state
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/purchases/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setPo(d);
        const qtys: Record<string, string> = {};
        (d.items ?? []).forEach((item: POItem) => {
          qtys[item.id] = String(Math.max(0, item.qty - item.receivedQty));
        });
        setReceiveQtys(qtys);
      })
      .catch(() => toast.error("Failed to load purchase order"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleReceive = async () => {
    setReceiving(true);
    try {
      const items = Object.entries(receiveQtys)
        .filter(([, q]) => parseFloat(q) > 0)
        .map(([itemId, qty]) => ({ itemId, receivedQty: parseFloat(qty) }));
      if (items.length === 0) return toast.error("Enter at least one received quantity");
      const res = await fetch(`/api/purchases/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      toast.success("Stock received");
      setReceiveOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to receive stock");
    } finally {
      setReceiving(false);
    }
  };

  const handlePayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return toast.error("Enter a valid amount");
    setPaying(true);
    try {
      const res = await fetch(`/api/purchases/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(payAmount), method: payMethod, notes: payNotes }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      toast.success("Payment recorded");
      setPayOpen(false);
      setPayAmount("");
      setPayNotes("");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  );

  if (!po) return (
    <div className="text-center py-12 text-gray-500">
      Purchase order not found. <Link href="/purchases" className="text-green-600 underline">Go back</Link>
    </div>
  );

  const balance = po.total - po.paidAmount;
  const canReceive = ["ORDERED", "PARTIAL"].includes(po.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(po.status)}`}>
                {po.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {po.supplier?.name} • Ordered {formatDate(po.orderDate)}
              {po.expectedDate && ` • Expected ${formatDate(po.expectedDate)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Print PO button + hidden print area */}
          <div>
            <Button variant="outline" size="sm" onClick={printPO}>
              <Printer className="h-4 w-4 mr-1.5" /> Print PO
            </Button>
            <div ref={printRef} style={{ display: "none" }}>
              <PurchaseOrderDoc
                poNumber={po.poNumber}
                date={po.orderDate}
                expectedDate={po.expectedDate}
                supplierName={po.supplier?.name}
                supplierPhone={po.supplier?.phone}
                supplierContact={po.supplier?.contactPerson}
                status={po.status}
                items={po.items.map((i) => ({
                  name: i.product?.name ?? "—",
                  sku: i.product?.sku,
                  qty: i.qty,
                  receivedQty: i.receivedQty,
                  unitCost: i.unitCost,
                  total: i.total,
                }))}
                total={po.total}
                paidAmount={po.paidAmount}
                notes={po.notes}
              />
            </div>
          </div>
          {canReceive && (
            <Sheet open={receiveOpen} onOpenChange={(o) => setReceiveOpen(o)}>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setReceiveOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-2" /> Receive Stock
              </Button>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Receive Stock — {po.poNumber}</SheetTitle>
                </SheetHeader>
                <div className="px-4 py-4 space-y-3">
                  {po.items.map((item) => {
                    const pending = item.qty - item.receivedQty;
                    return (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.product?.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{item.product?.sku}</p>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>Ordered: {item.qty}</p>
                            <p>Received: {item.receivedQty}</p>
                            <p className="font-medium text-gray-700">Pending: {pending}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-500 w-28 shrink-0">Receiving now:</Label>
                          <Input
                            type="number" min={0} max={pending}
                            value={receiveQtys[item.id] ?? ""}
                            onChange={(e) => setReceiveQtys((p) => ({ ...p, [item.id]: e.target.value }))}
                            className="h-8"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <SheetFooter>
                  <Button onClick={handleReceive} disabled={receiving} className="w-full bg-green-600 hover:bg-green-700">
                    {receiving ? "Receiving…" : "Confirm Receipt"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}

          {balance > 0 && (
            <Sheet open={payOpen} onOpenChange={(o) => setPayOpen(o)}>
              <Button variant="outline" onClick={() => setPayOpen(true)}>
                <DollarSign className="h-4 w-4 mr-2" /> Record Payment
              </Button>
              <SheetContent className="w-full sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>Record Payment</SheetTitle>
                </SheetHeader>
                <div className="px-4 py-4 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Total</span><span>{formatCurrency(po.total)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="text-green-700">{formatCurrency(po.paidAmount)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Balance Due</span><span className="text-red-600">{formatCurrency(balance)}</span></div>
                  </div>
                  <div className="space-y-1">
                    <Label>Amount (PKR) *</Label>
                    <Input type="number" min={0} max={balance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label>Payment Method</Label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent outline-none"
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={handlePayment} disabled={paying} className="w-full bg-green-600 hover:bg-green-700">
                    {paying ? "Saving…" : "Record Payment"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.product?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.product?.sku}</p>
                  </TableCell>
                  <TableCell className="text-right">{item.qty}</TableCell>
                  <TableCell className="text-right text-green-700">{item.receivedQty}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.qty - item.receivedQty > 0 ? "text-yellow-700 font-medium" : "text-gray-400"}>
                      {item.qty - item.receivedQty}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-end">
            <div className="w-60 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(po.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="text-green-700">{formatCurrency(po.paidAmount)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Balance</span>
                <span className={balance > 0 ? "text-red-600" : "text-gray-700"}>{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {po.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm text-gray-500">{formatDate(payment.createdAt)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-gray-500">{payment.notes ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium text-green-700">{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {po.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-600">{po.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
