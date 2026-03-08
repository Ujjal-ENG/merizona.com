import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import type {
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
  PaymentCheckoutStrategy,
} from "../interfaces/payment-checkout-strategy.interface";

@Injectable()
export class StripePaymentStrategy implements PaymentCheckoutStrategy {
  readonly provider = "stripe" as const;
  readonly option = {
    provider: this.provider,
    label: "Stripe",
    description: "Pay securely with cards and wallets through Stripe Checkout.",
  };

  constructor(private readonly configService: ConfigService) {}

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult> {
    const stripe = this.createStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: input.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.amountInCents,
          product_data: {
            name: item.name,
            metadata: compactMetadata({
              productId: item.productId,
              sku: item.sku,
              vendorId: item.vendorId,
            }),
          },
        },
      })),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: compactMetadata({
        ...input.metadata,
        marketplaceMode:
          input.vendorIds.length > 1 ? "multi-vendor" : "single-vendor",
        vendorCount: String(input.vendorIds.length),
        vendorIds: input.vendorIds.join(","),
        shippingAddress: JSON.stringify(input.shippingAddress),
      }),
    });

    if (!session.url || !session.id) {
      throw new InternalServerErrorException(
        "Checkout session URL was not generated",
      );
    }

    return {
      provider: this.provider,
      sessionId: session.id,
      url: session.url,
    };
  }

  private createStripeClient(): Stripe {
    const stripeSecretKey = this.configService.get<string>("STRIPE_SECRET_KEY");

    if (
      !stripeSecretKey ||
      stripeSecretKey === "sk_test_..." ||
      stripeSecretKey.includes("placeholder")
    ) {
      throw new InternalServerErrorException(
        "Stripe is not configured. Set STRIPE_SECRET_KEY.",
      );
    }

    return new Stripe(stripeSecretKey);
  }
}

function compactMetadata(
  metadata: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1].length > 0,
    ),
  );
}
