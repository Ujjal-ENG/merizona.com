import Link from "next/link";
import { Package, ShoppingBag, DollarSign, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../_components/ui/card";
import { Button } from "../../_components/ui/button";
import { apiFetch } from "../../_services/api-client";

interface VendorStats {
  totalProducts?: number;
  totalOrders?: number;
  pendingOrders?: number;
  revenue?: number;
  lowStockItems?: number;
}

async function getVendorStats(): Promise<VendorStats> {
  try {
    return await apiFetch<VendorStats>("/vendor/stats", { revalidate: 120 });
  } catch {
    return {};
  }
}

export default async function VendorDashboard() {
  const stats = await getVendorStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Manage your store and products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/vendor/orders">Manage Orders</Link>
          </Button>
          <Button asChild>
            <Link href="/vendor/products/new">Add Product</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/vendor/products" className="hover:underline">
                View all →
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingOrders ? (
                <span className="text-amber-600">
                  {stats.pendingOrders} pending
                </span>
              ) : (
                "All caught up"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.revenue
                ? `$${(stats.revenue / 100).toFixed(0)}`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">After commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lowStockItems ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/vendor/inventory" className="hover:underline">
                View inventory →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
