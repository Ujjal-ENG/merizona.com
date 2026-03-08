import type { PaymentProviderListing } from "../_lib/types";
import { clientFetch } from "./api-client";

export async function getCheckoutProviders(): Promise<PaymentProviderListing> {
  return clientFetch<PaymentProviderListing>("/api/payments/providers");
}
