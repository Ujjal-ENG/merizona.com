"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "../../_components/ui/button";
import { Input } from "../../_components/ui/input";
import { Label } from "../../_components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../_components/ui/card";
import { loginSchema, type LoginInput } from "../../_lib/validations/auth";
import { loginAction, vendorLoginAction } from "../../_services/auth.service";

interface LoginFormProps {
  callbackUrl?: string;
  mode?: "customer" | "vendor";
}

export function LoginForm({
  callbackUrl,
  mode = "customer",
}: LoginFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    const result =
      mode === "vendor" ? await vendorLoginAction(data) : await loginAction(data);

    if (result.success) {
      const safeCallback =
        callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : null;

      router.replace(safeCallback ?? result.redirectPath ?? "/account");
      router.refresh();
      return;
    }

    setServerError(result.error ?? "Login failed");
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>{mode === "vendor" ? "Vendor portal" : "Welcome back"}</CardTitle>
        <CardDescription>
          {mode === "vendor"
            ? "Sign in to manage vendor verification, products, and orders"
            : "Sign in to your customer or admin account"}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "vendor" ? "Enter Vendor Portal" : "Sign In"}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        {mode === "vendor" ? (
          <>
            Need a vendor account?
            <Link
              href="/vendor/register"
              className="ml-1 text-primary hover:underline"
            >
              Register
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="ml-1 text-primary hover:underline">
              Sign up
            </Link>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
