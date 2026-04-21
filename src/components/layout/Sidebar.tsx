"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck,
  BarChart3, Wallet, Receipt, Settings, LogOut, Leaf,
  Store, RefreshCw, PlusCircle, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const nav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "POS (Physical Sale)", href: "/pos", icon: Store },
  { title: "Separator" },
  { title: "Products", href: "/products", icon: Package },
  { title: "Inventory", href: "/inventory", icon: RefreshCw },
  { title: "Separator" },
  { title: "Purchases", href: "/purchases", icon: ShoppingCart },
  { title: "Suppliers", href: "/suppliers", icon: Truck },
  { title: "Separator" },
  { title: "Sales Orders", href: "/sales", icon: Receipt },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Separator" },
  { title: "Accounting", href: "/accounting", icon: BookOpen },
  { title: "Expenses", href: "/expenses", icon: Wallet },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Separator" },
  { title: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-green-900 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-green-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
          <Leaf className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">KissanMall</p>
          <p className="text-xs text-green-300">ERP System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item, i) => {
          if (item.title === "Separator") {
            return <Separator key={i} className="my-2 bg-green-700" />;
          }
          const Icon = item.icon!;
          const active = path === item.href || path.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-green-600 text-white"
                  : "text-green-100 hover:bg-green-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-green-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-green-100 hover:bg-green-800 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
