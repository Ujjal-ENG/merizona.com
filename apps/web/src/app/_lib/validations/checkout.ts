import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().default("Home"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  zip: z.string().min(1, "ZIP code is required"),
  country: z.string().default("US"),
  isDefault: z.boolean().default(false),
});

export const checkoutSchema = z.object({
  shippingAddress: addressSchema,
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
