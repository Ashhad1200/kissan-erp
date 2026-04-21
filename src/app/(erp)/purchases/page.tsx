"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Eye, Edit2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { name: string } | null;
  orderDate: string;
  expectedDate?: string | null;
  status: string;
  total: number;
  paidAmount: number;
}

const STATUSES = ["", "DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED"];

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/purchases${qs}`)
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => toast.error("Failed to load purchase orders"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = orders;

  const balance = (po: PurchaseOrder) => po.total - po.paidAmount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} orders</p>
        </div>
        <Link href="/purchases/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" /> New Purchase Order
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-gray-600">Filter by status:</Label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s || "all"}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === s
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
                  }`}
                >
                  {s || "All"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-400 py-12">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-sm font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplier?.name ?? "—"}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{formatDate(po.orderDate)}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{formatDate(po.expectedDate)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(po.total)}</TableCell>
                      <TableCell className="text-right text-green-700">{formatCurrency(po.paidAmount)}</TableCell>
                      <TableCell className="text-right">
                        <span className={balance(po) > 0 ? "text-red-600 font-medium" : "text-gray-500"}>
                          {formatCurrency(balance(po))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={`/purchases/${po.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/purchases/${po.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
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

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={className}>{children}</span>;
}
