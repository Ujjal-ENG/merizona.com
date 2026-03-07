"use server";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "./api-client";
import type { User, Vendor } from "../_lib/types";
import type { LoginInput, RegisterInput } from "../_lib/validations/auth";

interface AuthResponse {
  message: string;
  user: Pick<User, "_id" | "email" | "role" | "profile">;
}

export async function loginAction(
  data: LoginInput,
): Promise<{
  success: boolean;
  error?: string;
  user?: AuthResponse["user"];
  redirectPath?: string;
}> {
  try {
    const result = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
      forwardSetCookie: true,
    });

    const vendor = await apiFetch<Vendor>("/vendor/profile", {
      revalidate: 0,
    }).catch(() => null);

    const redirectPath =
      result.user.role === "platform_admin"
        ? "/admin"
        : vendor && vendor.status === "approved" && vendor.packageStatus === "active"
          ? "/vendor"
          : vendor
            ? "/account/become-vendor"
            : "/account";

    revalidateTag("user", "max");
    return { success: true, user: result.user, redirectPath };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { success: false, error: "Invalid email or password" };
      if (err.status === 429) return { success: false, error: "Too many attempts. Try again in a minute." };
    }
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function registerAction(
  data: Omit<RegisterInput, "confirmPassword">,
): Promise<{ success: boolean; error?: string; user?: AuthResponse["user"] }> {
  try {
    const result = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      forwardSetCookie: true,
    });
    return { success: true, user: result.user };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) return { success: false, error: "Email already in use" };
    }
    return { success: false, error: "Registration failed. Please try again." };
  }
}

export async function logoutAction() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // ignore errors — clear cookies anyway
  }
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  revalidateTag("user", "max");
  redirect("/login");
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiFetch<User>("/users/me", {
      revalidate: 0,
      tags: ["user"],
    });
  } catch {
    return null;
  }
}
