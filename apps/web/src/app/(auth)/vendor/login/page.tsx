import { LoginForm } from "../../login/login-form";

interface VendorLoginPageProps {
  searchParams?: Promise<{ callbackUrl?: string }>;
}

export default async function VendorLoginPage({
  searchParams,
}: VendorLoginPageProps) {
  const params = (await searchParams) ?? {};
  return <LoginForm callbackUrl={params.callbackUrl} mode="vendor" />;
}
