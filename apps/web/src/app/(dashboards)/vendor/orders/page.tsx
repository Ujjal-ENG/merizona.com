import Link from "next/link";
import { getVendorOrders } from "../../../_services/orders.service";
import { Badge } from "../../../_components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../_components/ui/table";
import { formatDate, formatPrice } from "../../../_lib/utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "../../../_lib/constants";
import { OrderStatusUpdater } from "./order-status-updater";

export const dynamic = "force-dynamic";

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const { data: orders, total } = await getVendorOrders(
    page,
    20,
    params.status,
  ).catch(() => ({ data: [], total: 0, page: 1, limit: 20 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground text-sm">{total} orders</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          "all",
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
        ].map(
          (s) => (
            <a
              key={s}
              href={`/vendor/orders${s !== "all" ? `?status=${s}` : ""}`}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                (params.status ?? "all") === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </a>
          ),
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <Link
                      href={`/track/${order._id}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ORDER_STATUS_COLORS[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatPrice(order.totalInCents)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    -{formatPrice(order.platformCommissionInCents)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusUpdater
                      orderId={order._id}
                      currentStatus={order.status}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
