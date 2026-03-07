import { apiFetch, normalizePaginatedResponse } from "./api-client";
import type { Product, PaginatedResponse } from "../_lib/types";
import { ITEMS_PER_PAGE } from "../_lib/constants";

export interface ProductQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  vendorSlug?: string;
  minPriceInCents?: number;
  maxPriceInCents?: number;
  sort?:
    | "createdAt"
    | "updatedAt"
    | "title"
    | "price"
    | "rating"
    | "reviewCount";
  order?: "asc" | "desc";
}

export async function getProducts(
  query: ProductQuery = {},
): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit ?? ITEMS_PER_PAGE));
  if (query.category) params.set("category", query.category);
  if (query.search) params.set("search", query.search);
  if (query.vendorSlug) params.set("vendorSlug", query.vendorSlug);
  if (query.minPriceInCents !== undefined) {
    params.set("minPriceInCents", String(query.minPriceInCents));
  }
  if (query.maxPriceInCents !== undefined) {
    params.set("maxPriceInCents", String(query.maxPriceInCents));
  }
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);

  const qs = params.toString();
  const response = await apiFetch<PaginatedResponse<Product>>(
    `/catalog/products${qs ? `?${qs}` : ""}`,
    { revalidate: 60, tags: ["products"] },
  );
  return normalizePaginatedResponse(response);
}

export async function getProductBySlug(slug: string): Promise<Product> {
  return apiFetch<Product>(`/catalog/products/${slug}`, {
    revalidate: 300,
    tags: [`product-${slug}`],
  });
}

// ─── Vendor product management (authenticated) ──────────────────────────────

export async function getVendorProducts(
  query: ProductQuery = {},
): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit ?? ITEMS_PER_PAGE));
  const qs = params.toString();
  const response = await apiFetch<PaginatedResponse<Product>>(
    `/vendor/products${qs ? `?${qs}` : ""}`,
    { revalidate: 0 },
  );
  return normalizePaginatedResponse(response);
}

export async function getVendorProductById(id: string): Promise<Product> {
  return apiFetch<Product>(`/vendor/products/${id}`, { revalidate: 0 });
}

export async function createProduct(data: unknown): Promise<Product> {
  return apiFetch<Product>("/vendor/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(
  id: string,
  data: unknown,
): Promise<Product> {
  return apiFetch<Product>(`/vendor/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/vendor/products/${id}`, { method: "DELETE" });
}
