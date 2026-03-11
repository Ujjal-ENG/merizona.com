"use server";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "./api-client";
import type { User } from "../_lib/types";
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

    const redirectPath =
      result.user.role === "platform_admin" ? "/admin" : "/account";

    revalidateTag("user", "max");
    return { success: true, user: result.user, redirectPath };
  } catch (err) {
    return { success: false, error: resolveAuthErrorMessage(err) };
  }
}

export async function vendorLoginAction(
  data: LoginInput,
): Promise<{
  success: boolean;
  error?: string;
  user?: AuthResponse["user"];
  redirectPath?: string;
}> {
  try {
    const result = await apiFetch<AuthResponse>("/auth/vendor/login", {
      method: "POST",
      body: JSON.stringify(data),
      forwardSetCookie: true,
    });

    revalidateTag("user", "max");
    return { success: true, user: result.user, redirectPath: "/vendor" };
  } catch (err) {
    return { success: false, error: resolveAuthErrorMessage(err) };
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
    revalidateTag("user", "max");
    return { success: true, user: result.user };
  } catch (err) {
    return { success: false, error: resolveAuthErrorMessage(err) };
  }
}

export async function vendorRegisterAction(
  data: Omit<RegisterInput, "confirmPassword">,
): Promise<{ success: boolean; error?: string; user?: AuthResponse["user"] }> {
  try {
    const result = await apiFetch<AuthResponse>("/auth/vendor/register", {
      method: "POST",
      body: JSON.stringify(data),
      forwardSetCookie: true,
    });
    revalidateTag("user", "max");
    return { success: true, user: result.user };
  } catch (err) {
    return { success: false, error: resolveAuthErrorMessage(err) };
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
  redirect("/");
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

function resolveAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const parsedMessage = parseApiErrorMessage(error.message);
    if (parsedMessage) {
      return parsedMessage;
    }

    if (error.status === 401) {
      return "Invalid email or password";
    }

    if (error.status === 409) {
      return "Email already in use";
    }

    if (error.status === 429) {
      return "Too many attempts. Try again in a minute.";
    }
  }

  return "Something went wrong. Please try again.";
}

function parseApiErrorMessage(payload: string): string | null {
  try {
    const parsed = JSON.parse(payload) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(", ");
    }
    return parsed.message ?? null;
  } catch {
    return payload || null;
  }
}
