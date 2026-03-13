import Link from "next/link";
import { Package, ShoppingBag, DollarSign, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../_components/ui/card";
import { Badge } from "../../_components/ui/badge";
import { Button } from "../../_components/ui/button";
import { apiFetch } from "../../_services/api-client";
import { getVendorVerification } from "../../_services/vendor.service";
import { VENDOR_VERIFICATION_LABELS } from "../../_lib/constants";

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
  const verification = await getVendorVerification().catch(() => null);

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

      {verification && verification.verificationStatus !== "verified" ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Business verification</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                You can manage products now. Complete verification when you are
                ready to finish business onboarding.
              </p>
            </div>
            <Badge variant="secondary">
              {VENDOR_VERIFICATION_LABELS[verification.verificationStatus]}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Submit your business documents from the verification page.
            </p>
            <Button asChild variant="outline">
              <Link href="/vendor/verify">Open Verification</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
