"use client";

import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "../../_components/ui/button";
import { Separator } from "../../_components/ui/separator";
import { Card, CardContent } from "../../_components/ui/card";
import { useCart } from "../../_hooks/use-cart";
import { formatPrice } from "../../_lib/utils";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalInCents } = useCart();

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center space-y-4">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground">
          Discover products from our independent vendors.
        </p>
        <Button asChild>
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  const subtotal = totalInCents();
  const vendorGroups = Array.from(
    items.reduce(
      (acc, item) => {
        const existing = acc.get(item.vendorId);
        if (existing) {
          existing.items.push(item);
          return acc;
        }

        acc.set(item.vendorId, {
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          items: [item],
        });
        return acc;
      },
      new Map<
        string,
        {
          vendorId: string;
          vendorName: string;
          items: typeof items;
        }
      >(),
    ).values(),
  );
  const shippingEstimate = vendorGroups.length * 499; // $4.99 estimate per vendor
  const total = subtotal + shippingEstimate;

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {vendorGroups.map((group) => (
            <div key={group.vendorId} className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">
                Sold by {group.vendorName}
              </div>
              {group.items.map((item) => (
                <Card key={item.variantSku}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-muted">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            No img
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.variantLabel}
                        </p>
                        <p className="font-semibold text-sm mt-1">
                          {formatPrice(item.priceInCents)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <button
                          onClick={() => removeItem(item.variantSku)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="flex items-center border rounded-md">
                          <button
                            onClick={() =>
                              updateQuantity(item.variantSku, item.quantity - 1)
                            }
                            className="px-2 py-1 hover:bg-muted transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.variantSku, item.quantity + 1)
                            }
                            className="px-2 py-1 hover:bg-muted transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <p className="text-sm font-semibold">
                          {formatPrice(item.priceInCents * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Shipping estimate
                  </span>
                  <span>{formatPrice(shippingEstimate)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <Button size="lg" className="w-full" asChild>
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>

              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
