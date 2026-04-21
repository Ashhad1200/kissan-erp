"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardStats, SalesTrend } from "@/types";
import {
  TrendingUp, ShoppingCart, AlertTriangle, Package,
  Users, Truck, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

type DashboardAPIResponse = DashboardStats & { salesTrend: SalesTrend[] };



function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const stats = data;
  const trends = data?.salesTrend ?? [];

  const kpis = [
    {
      label: "Today's Sales",
      value: formatCurrency(stats?.todaySales),
      icon: TrendingUp,
      bg: "bg-green-100",
      color: "text-green-600",
    },
    {
      label: "Today's Orders",
      value: String(stats?.todayOrders ?? 0),
      icon: ShoppingCart,
      bg: "bg-blue-100",
      color: "text-blue-600",
    },
    {
      label: "Low Stock Items",
      value: String(stats?.lowStockCount ?? 0),
      icon: AlertTriangle,
      bg: "bg-red-100",
      color: "text-red-600",
      highlight: (stats?.lowStockCount ?? 0) > 0,
    },
    {
      label: "Pending POs",
      value: String(stats?.pendingPOs ?? 0),
      icon: Package,
      bg: "bg-yellow-100",
      color: "text-yellow-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back — here&apos;s what&apos;s happening today</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{kpi.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${kpi.highlight ? "text-red-600" : "text-gray-900"}`}>
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`h-12 w-12 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Sales Trend — Last 7 Days</CardTitle>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-600 inline-block" />Physical</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />Shopify</span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trends} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => {
                  const date = new Date(d);
                  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short" });
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), ""]}
                labelFormatter={(label) => formatDate(String(label))}
              />
              <Bar dataKey="physical" name="Physical" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shopify" name="Shopify" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Products", value: stats?.totalProducts ?? 0, icon: Package, color: "text-green-600", bg: "bg-green-100" },
          { label: "Total Customers", value: stats?.totalCustomers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Total Suppliers", value: stats?.totalSuppliers ?? 0, icon: Truck, color: "text-purple-600", bg: "bg-purple-100" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-12 w-12 ${item.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                </div>
                <ArrowUpRight className="ml-auto h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
