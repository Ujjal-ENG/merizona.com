import { Users, Store, ShoppingBag, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../_components/ui/card";
import { apiFetch } from "../../_services/api-client";

interface AdminStats {
  totalUsers?: number;
  totalVendors?: number;
  totalOrders?: number;
  totalRevenue?: number;
}

async function getAdminStats(): Promise<AdminStats> {
  try {
    return await apiFetch<AdminStats>("/admin/stats", { revalidate: 60 });
  } catch {
    return {};
  }
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Overview of the Merizona marketplace
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers ?? "—"}
          description="Registered customers"
          icon={Users}
        />
        <StatCard
          title="Vendors"
          value={stats.totalVendors ?? "—"}
          description="Active vendor stores"
          icon={Store}
        />
        <StatCard
          title="Orders"
          value={stats.totalOrders ?? "—"}
          description="All time orders"
          icon={ShoppingBag}
        />
        <StatCard
          title="Revenue"
          value={
            stats.totalRevenue
              ? `$${(stats.totalRevenue / 100).toFixed(0)}`
              : "—"
          }
          description="Platform commission earned"
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
