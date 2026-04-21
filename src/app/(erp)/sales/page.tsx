"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Eye, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface SaleOrder {
  id: string;
  orderNumber: string;
  channel: "PHYSICAL" | "SHOPIFY";
  customer?: { name: string } | null;
  customerName?: string | null;
  orderDate?: string;
  createdAt: string;
  total?: number;
  totalAmount?: number;
  status: string;
}

const CHANNELS = ["", "PHYSICAL", "SHOPIFY"] as const;
const STATUSES = ["", "PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"];

export default function SalesPage() {
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [channel, setChannel] = useState<typeof CHANNELS[number]>("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (channel) params.set("channel", channel);
    if (status) params.set("status", status);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    fetch(`/api/sales?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.data ?? []);
        setOrders(list);
        setTotalCount(d.total ?? list.length);
      })
      .catch(() => toast.error("Failed to load sales"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [channel, status, dateFrom, dateTo, page]);

  const filtered = orders.filter((o) =>
    !search ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    (o.customer?.name ?? o.customerName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const customerDisplay = (o: SaleOrder) => o.customer?.name ?? o.customerName ?? "Walk-in";
  const orderTotal = (o: SaleOrder) => o.totalAmount ?? o.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} orders total</p>
        </div>
        <Link href="/sales/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" /> New Sale
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order # or customer…"
                className="pl-9 w-56"
              />
            </div>

            <div className="flex gap-1.5">
              {CHANNELS.map((c) => (
                <button
                  key={c || "all"}
                  onClick={() => { setChannel(c); setPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    channel === c
                      ? c === "SHOPIFY" ? "bg-blue-600 text-white border-blue-600"
                        : "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {c || "All"}
                </button>
              ))}
            </div>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s || "all"} value={s}>{s || "All Status"}</option>
              ))}
            </select>

            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none" />
            <span className="text-gray-400 text-sm">—</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                        No sales orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono font-medium text-sm">{o.orderNumber}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            o.channel === "SHOPIFY" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                          }`}>
                            {o.channel}
                          </span>
                        </TableCell>
                        <TableCell>{customerDisplay(o)}</TableCell>
                        <TableCell className="text-gray-500 text-sm">{formatDate(o.orderDate ?? o.createdAt)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(orderTotal(o))}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(o.status)}`}>
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Link href={`/sales/${o.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalCount > pageSize && (
                <div className="flex justify-between items-center pt-2 text-sm text-gray-500">
                  <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={page * pageSize >= totalCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
