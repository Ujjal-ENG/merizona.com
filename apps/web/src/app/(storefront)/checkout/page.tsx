"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../_components/ui/card";
import { Input } from "../../_components/ui/input";
import { Label } from "../../_components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../_components/ui/select";
import { Separator } from "../../_components/ui/separator";
import { Skeleton } from "../../_components/ui/skeleton";
import { useCart } from "../../_hooks/use-cart";
import type {
  PaymentProvider,
  PaymentProviderOption,
} from "../../_lib/types";
import { formatPrice } from "../../_lib/utils";
import {
  checkoutSchema,
  type CheckoutInput,
} from "../../_lib/validations/checkout";
import { getCheckoutProviders } from "../../_services/payments.service";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalInCents } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentProviders, setPaymentProviders] = useState<
    PaymentProviderOption[]
  >([]);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<
    PaymentProvider | ""
  >("");
  const [isLoadingPaymentProviders, setIsLoadingPaymentProviders] =
    useState(true);
  const [paymentProvidersError, setPaymentProvidersError] = useState<
    string | null
  >(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddress: { country: "US", label: "Home" },
    },
  });

  const subtotal = totalInCents();
  const selectedPaymentOption =
    paymentProviders.find(
      (provider) => provider.provider === selectedPaymentProvider,
    ) ?? null;
  const vendorGroups = Array.from(
    items
      .reduce(
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
      )
      .values(),
  );

  useEffect(() => {
    let ignore = false;

    async function loadPaymentProviders() {
      setIsLoadingPaymentProviders(true);
      setPaymentProvidersError(null);

      try {
        const result = await getCheckoutProviders();
        if (ignore) {
          return;
        }

        setPaymentProviders(result.providers);
        setSelectedPaymentProvider(
          result.defaultProvider ?? result.providers[0]?.provider ?? "",
        );
      } catch (err) {
        if (ignore) {
          return;
        }

        setPaymentProviders([]);
        setSelectedPaymentProvider("");
        setPaymentProvidersError(
          err instanceof Error
            ? err.message
            : "Failed to load payment methods.",
        );
      } finally {
        if (!ignore) {
          setIsLoadingPaymentProviders(false);
        }
      }
    }

    loadPaymentProviders();

    return () => {
      ignore = true;
    };
  }, []);

  if (items.length === 0) {
    router.replace("/cart");
    return null;
  }

  async function onSubmit(data: CheckoutInput) {
    setIsLoading(true);
    setError(null);

    try {
      if (!selectedPaymentProvider) {
        throw new Error("Select a payment method before continuing.");
      }

      const response = await fetch("/api/checkout/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentProvider: selectedPaymentProvider,
          items: items.map((i) => ({
            productId: i.productId,
            sku: i.variantSku,
            quantity: i.quantity,
          })),
          shippingAddress: {
            label: data.shippingAddress.label,
            line1: data.shippingAddress.line1,
            line2: data.shippingAddress.line2,
            city: data.shippingAddress.city,
            state: data.shippingAddress.state,
            zip: data.shippingAddress.zip,
            country: data.shippingAddress.country,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Checkout initialization failed");
      }

      const payload = (await response.json()) as {
        url?: string;
        sessionId?: string;
      };
      if (!payload.url || !payload.sessionId) {
        throw new Error("Checkout URL not returned");
      }

      window.location.assign(payload.url);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Checkout failed. Please try again.";
      setError(message);
      setIsLoading(false);
    }
  }

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="line1">Address Line 1</Label>
                    <Input
                      id="line1"
                      {...register("shippingAddress.line1")}
                      placeholder="123 Main St"
                    />
                    {errors.shippingAddress?.line1 && (
                      <p className="text-xs text-destructive">
                        {errors.shippingAddress.line1.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="line2">Line 2 (optional)</Label>
                    <Input
                      id="line2"
                      {...register("shippingAddress.line2")}
                      placeholder="Apt 4B"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...register("shippingAddress.city")}
                      placeholder="New York"
                    />
                    {errors.shippingAddress?.city && (
                      <p className="text-xs text-destructive">
                        {errors.shippingAddress.city.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      {...register("shippingAddress.state")}
                      placeholder="NY"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      {...register("shippingAddress.zip")}
                      placeholder="10001"
                    />
                    {errors.shippingAddress?.zip && (
                      <p className="text-xs text-destructive">
                        {errors.shippingAddress.zip.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input value="United States" disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  You will be redirected to a secure checkout page to complete
                  payment.
                </div>
                {isLoadingPaymentProviders ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : paymentProvidersError ? (
                  <p className="text-sm text-destructive">
                    {paymentProvidersError}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="payment-provider">Payment Method</Label>
                      <Select
                        value={selectedPaymentProvider}
                        onValueChange={(value) =>
                          setSelectedPaymentProvider(value as PaymentProvider)
                        }
                      >
                        <SelectTrigger id="payment-provider">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentProviders.map((provider) => (
                            <SelectItem
                              key={provider.provider}
                              value={provider.provider}
                            >
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPaymentOption && (
                      <p className="text-sm text-muted-foreground">
                        {selectedPaymentOption.description}
                      </p>
                    )}
                  </div>
                )}
                {vendorGroups.length > 1 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mt-4">
                    This cart contains products from {vendorGroups.length}{" "}
                    vendors. Your checkout will create separate seller orders
                    automatically.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 text-sm">
                  {vendorGroups.map((group) => (
                    <div key={group.vendorId} className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Sold by {group.vendorName}
                      </p>
                      {group.items.map((item) => (
                        <div
                          key={item.variantSku}
                          className="flex justify-between"
                        >
                          <span className="text-muted-foreground line-clamp-1 mr-2 flex-1">
                            {item.title}{" "}
                            <span className="text-xs">×{item.quantity}</span>
                          </span>
                          <span className="shrink-0">
                            {formatPrice(item.priceInCents * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={
                    isLoading ||
                    isLoadingPaymentProviders ||
                    !!paymentProvidersError ||
                    !selectedPaymentProvider
                  }
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedPaymentOption
                    ? `Continue With ${selectedPaymentOption.label}`
                    : "Proceed To Payment"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
