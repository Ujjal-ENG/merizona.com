import { apiFetch, clientFetch, normalizePaginatedResponse } from "./api-client";
import type {
  Vendor,
  PublicVendor,
  InventoryItem,
  PaginatedResponse,
} from "../_lib/types";

// ─── Vendor onboarding ────────────────────────────────────────────────────────

export async function applyAsVendor(data: {
  name: string;
  description?: string;
  businessInfo: {
    legalName: string;
    taxId?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  packageTier: "starter" | "growth" | "scale";
}): Promise<Vendor> {
  return apiFetch<Vendor>("/vendor/apply", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyVendorProfile(): Promise<Vendor> {
  return apiFetch<Vendor>("/vendor/profile", { revalidate: 0 });
}

export async function updateVendorSettings(data: Partial<Vendor>): Promise<Vendor> {
  return apiFetch<Vendor>("/vendor/settings", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function getVendorInventory(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<InventoryItem>> {
  const response = await apiFetch<PaginatedResponse<InventoryItem>>(
    `/vendor/inventory?page=${page}&limit=${limit}`,
    { revalidate: 0 },
  );
  return normalizePaginatedResponse(response);
}

export async function updateStock(
  sku: string,
  data: { quantityOnHand?: number; lowStockThreshold?: number },
): Promise<InventoryItem> {
  return apiFetch<InventoryItem>(`/vendor/inventory/${sku}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminVendors(
  page = 1,
  limit = 20,
  status?: string,
): Promise<PaginatedResponse<Vendor>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  const response = await apiFetch<PaginatedResponse<Vendor>>(
    `/admin/vendors?${params.toString()}`,
    { revalidate: 0 },
  );
  return normalizePaginatedResponse(response);
}

export async function approveVendor(id: string): Promise<Vendor> {
  return clientFetch<Vendor>(`/api/admin/vendors/${id}/approve`, {
    method: "POST",
  });
}

export async function suspendVendor(id: string): Promise<Vendor> {
  return clientFetch<Vendor>(`/api/admin/vendors/${id}/suspend`, {
    method: "POST",
  });
}

export async function activateVendorPackage(id: string): Promise<Vendor> {
  return clientFetch<Vendor>(`/api/admin/vendors/${id}/package/activate`, {
    method: "POST",
  });
}

export async function deactivateVendorPackage(id: string): Promise<Vendor> {
  return clientFetch<Vendor>(`/api/admin/vendors/${id}/package/deactivate`, {
    method: "POST",
  });
}

// ─── Public vendor discovery ────────────────────────────────────────────────

export async function getPublicVendors(query: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "createdAt" | "updatedAt" | "name";
  order?: "asc" | "desc";
} = {}): Promise<PaginatedResponse<PublicVendor>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);

  const response = await apiFetch<PaginatedResponse<PublicVendor>>(
    `/vendors${params.size > 0 ? `?${params.toString()}` : ""}`,
    { revalidate: 60, tags: ["public-vendors"] },
  );

  return normalizePaginatedResponse(response);
}

export async function getPublicVendorBySlug(slug: string): Promise<PublicVendor> {
  return apiFetch<PublicVendor>(`/vendors/${slug}`, {
    revalidate: 120,
    tags: [`public-vendor-${slug}`],
  });
}
