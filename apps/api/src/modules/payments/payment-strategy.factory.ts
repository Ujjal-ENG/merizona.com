import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ORDER_PAYMENT_PROVIDERS,
  type OrderPaymentProvider,
} from "../orders/schemas/order.schema";
import type {
  PaymentCheckoutStrategy,
  PaymentProviderOption,
} from "./interfaces/payment-checkout-strategy.interface";
import { StripePaymentStrategy } from "./strategies/stripe-payment.strategy";

@Injectable()
export class PaymentStrategyFactory {
  private readonly strategies = new Map<
    OrderPaymentProvider,
    PaymentCheckoutStrategy
  >();

  constructor(
    private readonly configService: ConfigService,
    stripePaymentStrategy: StripePaymentStrategy,
  ) {
    this.strategies.set(stripePaymentStrategy.provider, stripePaymentStrategy);
  }

  resolve(provider?: OrderPaymentProvider): PaymentCheckoutStrategy {
    const selectedProvider = provider ?? this.getDefaultProvider();
    const strategy = this.strategies.get(selectedProvider);

    if (!strategy) {
      throw new InternalServerErrorException(
        `Payment provider '${selectedProvider}' is not configured`,
      );
    }

    return strategy;
  }

  getDefaultProvider(): OrderPaymentProvider {
    const configuredProvider = this.configService
      .get<string>("DEFAULT_PAYMENT_PROVIDER", "stripe")
      .trim();

    if (
      !ORDER_PAYMENT_PROVIDERS.includes(
        configuredProvider as OrderPaymentProvider,
      )
    ) {
      throw new InternalServerErrorException(
        `Unsupported DEFAULT_PAYMENT_PROVIDER '${configuredProvider}'`,
      );
    }

    const provider = configuredProvider as OrderPaymentProvider;
    if (!this.strategies.has(provider)) {
      throw new InternalServerErrorException(
        `Default payment provider '${configuredProvider}' is not registered`,
      );
    }

    return provider;
  }

  listAvailableProviders(): PaymentProviderOption[] {
    return [...this.strategies.values()].map((strategy) => strategy.option);
  }
}
