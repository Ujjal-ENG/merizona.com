import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams?: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  return <LoginForm callbackUrl={params.callbackUrl} />;
}
