import type { PaginatedResponse } from "../_lib/types";

const NEST_INTERNAL_URL =
  process.env.NEST_INTERNAL_URL ?? "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "";

type CookieStoreLike = {
  toString(): string;
  set(
    name: string,
    value: string,
    options?: {
      path?: string;
      domain?: string;
      expires?: Date;
      httpOnly?: boolean;
      maxAge?: number;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
    },
  ): void;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Server-side fetch to NestJS with cookie forwarding.
 * Use in RSC, Server Actions, and Route Handlers.
 */
export async function apiFetch<T>(
  path: string,
  opts: RequestInit & {
    revalidate?: number;
    tags?: string[];
    forwardSetCookie?: boolean;
  } = {},
): Promise<T> {
  const cookieStore = await getServerCookieStore();
  const { revalidate, tags, forwardSetCookie = false, ...fetchOpts } = opts;
  const forwardedCookie = cookieStore?.toString();

  const res = await fetch(`${NEST_INTERNAL_URL}/api/v1${path}`, {
    ...fetchOpts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(forwardedCookie ? { Cookie: forwardedCookie } : {}),
      "X-Internal-Token": INTERNAL_SECRET,
      ...(fetchOpts.headers as Record<string, string>),
    },
    next: {
      revalidate: revalidate ?? 0,
      tags,
    },
  });

  if (forwardSetCookie && cookieStore) {
    const setCookieHeaders = getSetCookieHeaders(res);
    for (const setCookie of setCookieHeaders) {
      applySetCookieHeader(cookieStore, setCookie);
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

function getSetCookieHeaders(res: Response): string[] {
  const headersAny = res.headers as any;
  if (typeof headersAny.getSetCookie === "function") {
    const values = headersAny.getSetCookie();
    if (Array.isArray(values)) return values;
  }

  const combined = res.headers.get("set-cookie");
  if (!combined) return [];

  // Split multiple Set-Cookie values while avoiding commas in Expires.
  return combined.split(/,(?=\s*[!#$%&'*+.^_`|~0-9A-Za-z-]+=)/g);
}

function applySetCookieHeader(
  cookieStore: CookieStoreLike,
  setCookieHeader: string,
) {
  const parts = setCookieHeader.split(";").map((part) => part.trim());
  const [nameValue, ...attrs] = parts;
  const eqIndex = nameValue.indexOf("=");
  if (eqIndex <= 0) return;

  const name = nameValue.slice(0, eqIndex);
  const value = nameValue.slice(eqIndex + 1);

  const options: {
    path?: string;
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  } = {};

  for (const attr of attrs) {
    const [rawKey, ...rawValue] = attr.split("=");
    const key = rawKey.toLowerCase();
    const valuePart = rawValue.join("=");

    if (key === "path") options.path = valuePart || "/";
    if (key === "domain") options.domain = valuePart;
    if (key === "httponly") options.httpOnly = true;
    if (key === "secure") options.secure = true;

    if (key === "samesite") {
      const normalized = valuePart.toLowerCase();
      options.sameSite =
        normalized === "strict"
          ? "strict"
          : normalized === "none"
            ? "none"
            : "lax";
    }

    if (key === "max-age") {
      const maxAge = Number(valuePart);
      if (Number.isFinite(maxAge)) options.maxAge = maxAge;
    }

    if (key === "expires") {
      const date = new Date(valuePart);
      if (!Number.isNaN(date.getTime())) options.expires = date;
    }
  }

  cookieStore.set(name, value, options);
}

async function getServerCookieStore(): Promise<CookieStoreLike | null> {
  if (typeof window !== "undefined") {
    return null;
  }

  const { cookies } = await import("next/headers");
  return (await cookies()) as unknown as CookieStoreLike;
}

/**
 * Client-side fetch to Next.js API routes (BFF) or direct to NestJS.
 * Use in Client Components with useEffect / event handlers.
 */
export async function clientFetch<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const base =
    typeof window !== "undefined"
      ? ""
      : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1");

  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers as Record<string, string>),
    },
    ...opts,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

type ApiPaginatedMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
};

type ApiPaginatedEnvelope<T> =
  | PaginatedResponse<T>
  | { data: T[]; meta: ApiPaginatedMeta };

export function normalizePaginatedResponse<T>(
  payload: ApiPaginatedEnvelope<T>,
): PaginatedResponse<T> {
  if ("meta" in payload) {
    return {
      data: payload.data,
      total: payload.meta.total,
      page: payload.meta.page,
      limit: payload.meta.limit,
    };
  }

  return payload;
}
