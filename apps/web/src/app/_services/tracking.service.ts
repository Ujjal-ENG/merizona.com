import { apiFetch } from "./api-client";
import type { Shipment } from "../_lib/types";

export async function getShipmentByOrderId(
  orderId: string,
): Promise<Shipment | null> {
  try {
    return await apiFetch<Shipment>(`/tracking/${orderId}`, {
      revalidate: 0,
    });
  } catch {
    return null;
  }
}
