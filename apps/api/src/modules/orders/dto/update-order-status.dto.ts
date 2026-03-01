import { IsIn } from "class-validator";

export const VENDOR_MANAGEABLE_ORDER_STATUSES = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type VendorManageableOrderStatus =
  (typeof VENDOR_MANAGEABLE_ORDER_STATUSES)[number];

export class UpdateOrderStatusDto {
  @IsIn(VENDOR_MANAGEABLE_ORDER_STATUSES)
  status: VendorManageableOrderStatus;
}
