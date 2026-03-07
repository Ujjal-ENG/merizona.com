import { apiFetch, normalizePaginatedResponse } from "./api-client";
import type { CheckoutResult, Order, PaginatedResponse } from "../_lib/types";

export interface CheckoutPayload {
  items: Array<{
    productId: string;
    sku: string;
    quantity: number;
  }>;
  shippingAddress: {
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    zip: string;
    country: string;
  };
  paymentIntentId: string;
}

export async function checkout(data: CheckoutPayload): Promise<CheckoutResult> {
  return apiFetch<CheckoutResult>("/orders/checkout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyOrders(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Order>> {
  const response = await apiFetch<PaginatedResponse<Order>>(
    `/account/orders?page=${page}&limit=${limit}`,
    { revalidate: 0 },
  );
  return normalizePaginatedResponse(response);
}

export async function getMyOrderById(id: string): Promise<Order> {
  return apiFetch<Order>(`/account/orders/${id}`, { revalidate: 0 });
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export async function getVendorOrders(
  page = 1,
  limit = 20,
  status?: string,
): Promise<PaginatedResponse<Order>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  const response = await apiFetch<PaginatedResponse<Order>>(
    `/vendor/orders?${params.toString()}`,
    { revalidate: 0 },
  );
  return normalizePaginatedResponse(response);
}

export async function updateVendorOrderStatus(
  id: string,
  status: Order["status"],
): Promise<Order> {
  return apiFetch<Order>(`/vendor/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminOrders(
  page = 1,
  limit = 20,
  status?: string,
): Promise<PaginatedResponse<Order>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  const response = await apiFetch<PaginatedResponse<Order>>(
    `/admin/orders?${params.toString()}`,
    { revalidate: 0 },
  );
  return normalizePaginatedResponse(response);
}
