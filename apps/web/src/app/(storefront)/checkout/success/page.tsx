import { CheckoutSuccessClient } from "./success-client";

interface CheckoutSuccessPageProps {
  searchParams?: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = (await searchParams) ?? {};
  return <CheckoutSuccessClient sessionId={params.session_id} />;
}
