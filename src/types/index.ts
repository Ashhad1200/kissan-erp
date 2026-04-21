export type UserRole = "ADMIN" | "MANAGER" | "STAFF";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  monthSales: number;
  lowStockCount: number;
  pendingPOs: number;
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
}

export interface SalesTrend {
  date: string;
  physical: number;
  shopify: number;
}
