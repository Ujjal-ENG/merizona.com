import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CheckoutPreparationService } from "../orders/checkout-preparation.service";
import { CheckoutDto } from "../orders/dto/checkout.dto";
import { OrdersService } from "../orders/orders.service";
import { InitiateCheckoutDto } from "./dto/initiate-checkout.dto";
import { PaymentProviderListing } from "./interfaces/payment-checkout-strategy.interface";
import { PaymentStrategyFactory } from "./payment-strategy.factory";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly checkoutPreparationService: CheckoutPreparationService,
    private readonly paymentStrategyFactory: PaymentStrategyFactory,
  ) {}

  getCheckoutProviders(): PaymentProviderListing {
    return {
      defaultProvider: this.paymentStrategyFactory.getDefaultProvider(),
      providers: this.paymentStrategyFactory.listAvailableProviders(),
    };
  }

  async initiateCheckout(customerId: string, dto: InitiateCheckoutDto) {
    const preparedCheckout = await this.checkoutPreparationService.prepare(
      dto.items,
    );
    const strategy = this.paymentStrategyFactory.resolve(dto.paymentProvider);
    const storefrontBaseUrl = this.resolveStorefrontBaseUrl();
    const session = await strategy.createCheckoutSession({
      items: preparedCheckout.items.map((item) => ({
        productId: item.productId,
        vendorId: item.vendorId,
        name: item.title,
        sku: item.sku,
        amountInCents: item.priceInCents,
        quantity: item.quantity,
      })),
      shippingAddress: dto.shippingAddress,
      successUrl: `${storefrontBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${storefrontBaseUrl}/checkout?canceled=1`,
      vendorIds: preparedCheckout.vendorIds,
      metadata: {
        checkoutSource: "api",
      },
    });

    await this.ordersService.checkout(
      customerId,
      this.toOrderCheckoutDto(dto, session.sessionId, session.provider),
      preparedCheckout,
    );

    return session;
  }

  private resolveStorefrontBaseUrl(): string {
    const baseUrl = this.configService.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );

    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }

  private toOrderCheckoutDto(
    dto: InitiateCheckoutDto,
    paymentIntentId: string,
    paymentProvider: CheckoutDto["paymentProvider"],
  ): CheckoutDto {
    return {
      items: dto.items,
      shippingAddress: dto.shippingAddress,
      paymentIntentId,
      paymentProvider,
    };
  }
}
