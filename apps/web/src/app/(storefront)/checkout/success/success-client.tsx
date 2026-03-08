"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../../../_components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../_components/ui/card";
import { useCart } from "../../../_hooks/use-cart";

interface CheckoutSuccessClientProps {
  sessionId?: string;
}

export function CheckoutSuccessClient({ sessionId }: CheckoutSuccessClientProps) {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="container max-w-2xl py-16">
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <CardTitle className="mt-2">Payment Successful</CardTitle>
          <CardDescription>
            Your payment was processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {sessionId && (
            <p className="text-xs text-muted-foreground break-all">
              Session: {sessionId}
            </p>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/account">Go To Account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
