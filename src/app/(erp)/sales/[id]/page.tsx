"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { SaleReceipt } from "@/components/print/SaleReceipt";
import { usePrint } from "@/hooks/usePrint";

interface SaleItem {
  id: string;
  product: { name: string; sku: string; unit: string } | null;
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
}

interface SaleOrder {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  orderDate: string;
  customer: { name: string; phone?: string | null } | null;
  notes?: string | null;
  subTotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  items: SaleItem[];
  payments: Payment[];
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<SaleOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const { ref: printRef, print: printInvoice } = usePrint("KissanMall — Invoice");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/sales/${id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.data ?? d))
      .catch(() => toast.error("Failed to load sale order"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  );

  if (!order) return (
    <div className="text-center py-12 text-gray-500">
      Sale order not found. <Link href="/sales" className="text-green-600 underline">Go back</Link>
    </div>
  );

  const balance = order.total - order.paidAmount;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                {order.channel === "PHYSICAL" ? "Physical" : "Shopify"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {order.customer ? order.customer.name : "Walk-in Customer"} • {formatDate(order.orderDate)}
            </p>
          </div>
        </div>
        {/* Print Invoice button + hidden print area */}
        <div>
          <Button variant="outline" size="sm" onClick={printInvoice}>
            <Printer className="h-4 w-4 mr-1.5" /> Print Invoice
          </Button>
          <div ref={printRef} style={{ display: "none" }}>
            <SaleReceipt
              variant="invoice"
              orderNumber={order.orderNumber}
              date={order.orderDate}
              channel={order.channel}
              customerName={order.customer?.name}
              items={order.items.map((i) => ({
                name: i.product?.name ?? "—",
                sku: i.product?.sku,
                qty: i.qty,
                unitPrice: i.unitPrice,
                discount: i.discount,
                total: i.total,
              }))}
              subtotal={order.subTotal}
              discount={order.discount}
              total={order.total}
              paidAmount={order.paidAmount}
              notes={order.notes ?? undefined}
            />
          </div>
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
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.product?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.product?.sku}</p>
                  </TableCell>
                  <TableCell className="text-right">{item.qty} {item.product?.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right text-red-600">
                    {item.discount > 0 ? `-${formatCurrency(item.discount)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-end">
            <div className="w-60 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(order.subTotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Paid</span>
                <span className="text-green-700">{formatCurrency(order.paidAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Balance</span>
                <span className={balance > 0 ? "text-red-600" : "text-gray-700"}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {order.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-gray-500">{formatDate(p.createdAt)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell className="text-right font-medium text-green-700">{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {order.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-gray-600">{order.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
