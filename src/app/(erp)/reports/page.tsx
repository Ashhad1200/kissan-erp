"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TrendingUp, Package, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface SaleOrder {
  id: string;
  orderNumber: string;
  channel: string;
  customer?: { name: string } | null;
  customerName?: string | null;
  orderDate?: string;
  createdAt: string;
  totalAmount?: number;
  total?: number;
  status: string;
}

interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  costPrice: number;
  salePrice: number;
  category?: { name: string } | null;
}

interface ExpenseItem {
  category: string;
  total: number;
  count: number;
}

export default function ReportsPage() {
  const [salesOrders, setSalesOrders] = useState<SaleOrder[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Sales filter state
  const [salesFrom, setSalesFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [salesTo, setSalesTo] = useState(new Date().toISOString().split("T")[0]);
  const [salesChannel, setSalesChannel] = useState("");

  // Expense filter state
  const [expFrom, setExpFrom] = useState(salesFrom);
  const [expTo, setExpTo] = useState(salesTo);

  const loadSales = () => {
    setLoadingSales(true);
    const params = new URLSearchParams();
    if (salesFrom) params.set("from", salesFrom);
    if (salesTo) params.set("to", salesTo);
    if (salesChannel) params.set("channel", salesChannel);
    params.set("pageSize", "500");
    fetch(`/api/sales?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setSalesOrders(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => toast.error("Failed to load sales report"))
      .finally(() => setLoadingSales(false));
  };

  const loadProducts = () => {
    setLoadingProducts(true);
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => toast.error("Failed to load inventory report"))
      .finally(() => setLoadingProducts(false));
  };

  const loadExpenses = () => {
    setLoadingExpenses(true);
    const params = new URLSearchParams();
    if (expFrom) params.set("from", expFrom);
    if (expTo) params.set("to", expTo);
    params.set("groupBy", "category");
    fetch(`/api/expenses/summary?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setExpenses(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {
        // Fallback: load all and aggregate
        fetch(`/api/expenses?${params.toString()}`)
          .then((r) => r.json())
          .then((rawData) => {
            const items = Array.isArray(rawData) ? rawData : (rawData.data ?? []);
            const grouped = items.reduce((acc: Record<string, ExpenseItem>, e: { category: string; amount: number }) => {
              if (!acc[e.category]) acc[e.category] = { category: e.category, total: 0, count: 0 };
              acc[e.category].total += e.amount;
              acc[e.category].count += 1;
              return acc;
            }, {});
            setExpenses(Object.values(grouped));
          })
          .catch(() => toast.error("Failed to load financial report"));
      })
      .finally(() => setLoadingExpenses(false));
  };

  useEffect(() => { loadSales(); }, [salesFrom, salesTo, salesChannel]);
  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { loadExpenses(); }, [expFrom, expTo]);

  const orderTotal = (o: SaleOrder) => o.totalAmount ?? o.total ?? 0;
  const salesRevenue = salesOrders.reduce((s, o) => s + orderTotal(o), 0);
  const avgOrderValue = salesOrders.length > 0 ? salesRevenue / salesOrders.length : 0;
  const inventoryValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);
  const inventorySaleValue = products.reduce((s, p) => s + p.stock * p.salePrice, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);

  const Spinner = () => (
    <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business intelligence and analytics</p>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
          <TabsTrigger value="financial">Financial Summary</TabsTrigger>
        </TabsList>

        {/* SALES REPORT */}
        <TabsContent value="sales">
          <div className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                <span className="text-sm text-gray-500 font-medium">Period:</span>
                <input type="date" value={salesFrom} onChange={(e) => setSalesFrom(e.target.value)}
                  className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none" />
                <span className="text-gray-400">—</span>
                <input type="date" value={salesTo} onChange={(e) => setSalesTo(e.target.value)}
                  className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none" />
                <select value={salesChannel} onChange={(e) => setSalesChannel(e.target.value)}
                  className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none ml-2">
                  <option value="">All Channels</option>
                  <option value="PHYSICAL">Physical</option>
                  <option value="SHOPIFY">Shopify</option>
                </select>
                <Button size="sm" onClick={loadSales} className="bg-green-600 hover:bg-green-700">Run</Button>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Total Revenue", value: formatCurrency(salesRevenue), icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
                { label: "Total Orders", value: String(salesOrders.length), icon: Package, color: "text-blue-600", bg: "bg-blue-100" },
                { label: "Avg. Order Value", value: formatCurrency(avgOrderValue), icon: DollarSign, color: "text-purple-600", bg: "bg-purple-100" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label}>
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={`h-12 w-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                        <p className="text-xl font-bold">{stat.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {loadingSales ? <Spinner /> : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Order #</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right pr-4">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesOrders.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12 pl-4">No orders in this period</TableCell></TableRow>
                      ) : (
                        salesOrders.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell className="pl-4 font-mono text-sm">{o.orderNumber}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${o.channel === "SHOPIFY" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                {o.channel}
                              </span>
                            </TableCell>
                            <TableCell>{o.customer?.name ?? o.customerName ?? "Walk-in"}</TableCell>
                            <TableCell className="text-sm text-gray-500">{formatDate(o.orderDate ?? o.createdAt)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(o.status)}`}>{o.status}</span>
                            </TableCell>
                            <TableCell className="text-right pr-4 font-medium">{formatCurrency(orderTotal(o))}</TableCell>
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

        {/* INVENTORY REPORT */}
        <TabsContent value="inventory">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Total Products", value: String(products.length), icon: Package, color: "text-green-600", bg: "bg-green-100" },
                { label: "Inventory Cost Value", value: formatCurrency(inventoryValue), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-100" },
                { label: "Inventory Sale Value", value: formatCurrency(inventorySaleValue), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label}>
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={`h-12 w-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                        <p className="text-xl font-bold">{stat.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {loadingProducts ? <Spinner /> : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Cost Price</TableHead>
                        <TableHead className="text-right">Sale Price</TableHead>
                        <TableHead className="text-right pr-4">Cost Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-12 pl-4">No products</TableCell></TableRow>
                      ) : (
                        products.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="pl-4 font-medium">{p.name}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-500">{p.sku}</TableCell>
                            <TableCell>{p.category?.name ?? "—"}</TableCell>
                            <TableCell className="text-right">{p.stock}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.costPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.salePrice)}</TableCell>
                            <TableCell className="text-right pr-4 font-medium">{formatCurrency(p.stock * p.costPrice)}</TableCell>
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

        {/* FINANCIAL SUMMARY */}
        <TabsContent value="financial">
          <div className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                <span className="text-sm text-gray-500 font-medium">Period:</span>
                <input type="date" value={expFrom} onChange={(e) => setExpFrom(e.target.value)}
                  className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none" />
                <span className="text-gray-400">—</span>
                <input type="date" value={expTo} onChange={(e) => setExpTo(e.target.value)}
                  className="border border-input rounded-md px-2 py-1 text-sm bg-transparent outline-none" />
                <Button size="sm" onClick={loadExpenses} className="bg-green-600 hover:bg-green-700">Run</Button>
              </CardContent>
            </Card>

            {loadingExpenses ? <Spinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Expenses by Category</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Category</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right pr-4">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-gray-400 py-8 pl-4">No expenses in this period</TableCell></TableRow>
                        ) : (
                          expenses.map((e) => (
                            <TableRow key={e.category}>
                              <TableCell className="pl-4">
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">{e.category}</span>
                              </TableCell>
                              <TableCell className="text-right text-gray-500">{e.count}</TableCell>
                              <TableCell className="text-right pr-4 font-medium">{formatCurrency(e.total)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    {expenses.length > 0 && (
                      <div className="border-t px-4 py-3 flex justify-between bg-gray-50">
                        <span className="text-sm font-medium text-gray-600">Total Expenses</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b">
                      <span className="text-gray-500">Revenue (this period)</span>
                      <span className="font-medium text-green-700">{formatCurrency(salesRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b">
                      <span className="text-gray-500">Total Expenses</span>
                      <span className="font-medium text-red-600">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2">
                      <span className="font-semibold text-gray-700">Net</span>
                      <span className={`font-bold text-base ${salesRevenue - totalExpenses >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {formatCurrency(salesRevenue - totalExpenses)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
