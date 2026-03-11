import { z } from "zod";

export const vendorVerificationSchema = z.object({
  name: z.string().min(2, "Store name is required"),
  description: z.string().max(500).optional(),
  legalName: z.string().min(1, "Legal name is required"),
  taxId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  packageTier: z.enum(["starter", "growth", "scale"]),
});

export type VendorVerificationInput = z.infer<typeof vendorVerificationSchema>;
