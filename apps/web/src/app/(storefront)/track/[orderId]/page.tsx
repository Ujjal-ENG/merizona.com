import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../_components/ui/card";
import { Badge } from "../../../_components/ui/badge";
import { OrderTimeline } from "../../../_components/order-timeline";
import { getShipmentByOrderId } from "../../../_services/tracking.service";
import { getMyOrderById } from "../../../_services/orders.service";
import { formatDate, formatPrice } from "../../../_lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../../../_lib/constants";
import { TrackingLiveUpdates } from "./tracking-live-updates";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function TrackOrderPage({ params }: Props) {
  const { orderId } = await params;

  let order;
  try {
    order = await getMyOrderById(orderId);
  } catch {
    notFound();
  }

  const shipment = await getShipmentByOrderId(orderId);

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Track Order</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Order #{order.orderNumber}
      </p>

      <div className="space-y-6">
        {/* Order status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Status</CardTitle>
              <Badge variant={ORDER_STATUS_COLORS[order.status]}>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Placed</p>
                <p className="font-medium">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium">{formatPrice(order.totalInCents)}</p>
              </div>
              {order.shippingAddress && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Shipping to</p>
                  <p className="font-medium">
                    {order.shippingAddress.line1}, {order.shippingAddress.city},{" "}
                    {order.shippingAddress.state} {order.shippingAddress.zip}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tracking */}
        {shipment ? (
          <Card>
            <CardHeader>
              <CardTitle>Shipment Tracking</CardTitle>
              {shipment.trackingNumber && (
                <p className="text-sm text-muted-foreground">
                  {shipment.carrier.toUpperCase()} · {shipment.trackingNumber}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <TrackingLiveUpdates
                orderId={orderId}
                initialTimeline={shipment.timeline}
                initialStatus={shipment.status}
                estimatedDelivery={shipment.estimatedDelivery}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Shipping label not yet created. Check back after the vendor
              processes your order.
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.sku} · Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium shrink-0">
                    {formatPrice(item.priceInCents * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
