import { CheckoutShippingAddressDto } from "../../orders/dto/checkout.dto";
import { OrderPaymentProvider } from "../../orders/schemas/order.schema";

export interface PaymentProviderOption {
  provider: OrderPaymentProvider;
  label: string;
  description: string;
}

export interface PaymentProviderListing {
  defaultProvider: OrderPaymentProvider;
  providers: PaymentProviderOption[];
}

export interface PaymentCheckoutItem {
  productId: string;
  vendorId: string;
  name: string;
  sku: string;
  amountInCents: number;
  quantity: number;
}

export interface CreateCheckoutSessionInput {
  items: PaymentCheckoutItem[];
  shippingAddress: CheckoutShippingAddressDto;
  successUrl: string;
  cancelUrl: string;
  vendorIds: string[];
  metadata?: Record<string, string | undefined>;
}

export interface CreateCheckoutSessionResult {
  provider: OrderPaymentProvider;
  sessionId: string;
  url: string;
}

export interface PaymentCheckoutStrategy {
  readonly provider: OrderPaymentProvider;
  readonly option: PaymentProviderOption;
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult>;
}
