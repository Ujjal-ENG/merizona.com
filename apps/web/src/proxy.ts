import { NextResponse, type NextRequest } from "next/server";

const AUTH_PATHS = ["/login", "/register", "/vendor/login", "/vendor/register"];

function isSafeCallbackPath(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isVendorAuthPath = ["/vendor/login", "/vendor/register"].some((p) =>
    pathname.startsWith(p),
  );
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isVendorPath = pathname.startsWith("/vendor");
  const isAccountPath = pathname.startsWith("/account");
  const isAdminPath = pathname.startsWith("/admin");
  const isCheckoutPath = pathname.startsWith("/checkout");
  const isProtected =
    isVendorPath || isAccountPath || isAdminPath || isCheckoutPath;

  // Skip non-relevant paths fast
  if (!isProtected && !isAuthPage) return NextResponse.next();

  // Check auth via cookie presence (fast check — NestJS verifies the JWT)
  const accessToken = request.cookies.get("access_token");

  if (isAuthPage) {
    // Already logged in → redirect to appropriate dashboard
    if (accessToken) {
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      if (isSafeCallbackPath(callbackUrl)) {
        return NextResponse.redirect(new URL(callbackUrl, request.url));
      }

      try {
        const [, payloadB64] = accessToken.value.split(".");
        const payload = JSON.parse(
          Buffer.from(payloadB64, "base64url").toString(),
        ) as {
          role?: string;
        };

        if (payload.role === "vendor") {
          return NextResponse.redirect(new URL("/vendor", request.url));
        }

        if (payload.role === "platform_admin") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // Fall through to default redirect.
      }

      return NextResponse.redirect(new URL("/account", request.url));
    }
    return NextResponse.next();
  }

  if (isProtected && !accessToken) {
    const loginUrl = new URL(isVendorPath ? "/vendor/login" : "/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access: decode JWT payload (not verify — verification happens in NestJS)
  if (accessToken) {
    try {
      const [, payloadB64] = accessToken.value.split(".");
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString(),
      ) as {
        role?: string;
        vendorId?: string;
        membership?: { role?: string; permissions?: string[] };
      };

      const isAdmin = payload.role === "platform_admin";
      const isVendorAccount = payload.role === "vendor";
      const isVendorMember = Boolean(payload.vendorId && payload.membership?.role);
      const isVendorVerifyPath = pathname === "/vendor/verify";

      if (isAdminPath && !isAdmin) {
        const redirect = isVendorAccount ? "/vendor" : "/account";
        if (!pathname.startsWith(redirect)) {
          return NextResponse.redirect(new URL(redirect, request.url));
        }
      }

      if (isAccountPath && isVendorAccount) {
        return NextResponse.redirect(new URL("/vendor", request.url));
      }

      if (isVendorPath && isVendorAuthPath) {
        return NextResponse.next();
      }

      if (isVendorPath && !isVendorAccount) {
        const redirect = isAdmin ? "/admin" : "/account";
        if (!pathname.startsWith(redirect)) {
          return NextResponse.redirect(new URL(redirect, request.url));
        }
      }

      if (isVendorPath && isVendorAccount && !isVendorMember && !isVendorVerifyPath) {
        return NextResponse.redirect(new URL("/vendor/verify", request.url));
      }
    } catch {
      // Malformed token — let NestJS handle the 401
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
