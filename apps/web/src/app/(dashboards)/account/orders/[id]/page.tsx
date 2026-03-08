import { notFound } from "next/navigation";
import Link from "next/link";
import { getMyOrderById } from "../../../../_services/orders.service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../_components/ui/card";
import { Badge } from "../../../../_components/ui/badge";
import { Button } from "../../../../_components/ui/button";
import { Separator } from "../../../../_components/ui/separator";
import { formatDate, formatPrice } from "../../../../_lib/utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "../../../../_lib/constants";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  let order;
  try {
    order = await getMyOrderById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order Details</h1>
          <p className="text-muted-foreground text-sm font-mono">
            #{order.orderNumber}
          </p>
        </div>
        <Badge variant={ORDER_STATUS_COLORS[order.status]}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-14 h-14 object-cover rounded border"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.sku}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm">{formatPrice(item.priceInCents)} × {item.quantity}</p>
                  <p className="text-sm font-medium">
                    {formatPrice(item.priceInCents * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotalInCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatPrice(order.shippingInCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatPrice(order.taxInCents)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatPrice(order.totalInCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>{order.shippingAddress?.line1}</p>
          {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
          <p>
            {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
            {order.shippingAddress?.zip}
          </p>
          <p>{order.shippingAddress?.country}</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/account/orders">← Back to Orders</Link>
        </Button>
        <Button asChild>
          <Link href={`/track/${order._id}`}>Track Shipment</Link>
        </Button>
      </div>
    </div>
  );
}
