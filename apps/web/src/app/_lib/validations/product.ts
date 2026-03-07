import { z } from "zod";

export const productVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  label: z.string().min(1, "Label is required"),
  priceInCents: z.number().int().positive("Price must be a positive number"),
  images: z.array(z.string().url()).default([]),
});

export const createProductSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.array(z.string()).min(1, "Select at least one category"),
  attributes: z.record(z.string()).default({}),
  variants: z
    .array(productVariantSchema)
    .min(1, "At least one variant is required"),
  status: z.enum(["draft", "published"]).default("draft"),
  tags: z.array(z.string()).default([]),
});

export const updateProductSchema = createProductSchema
  .partial()
  .extend({
    status: z.enum(["draft", "published", "archived"]).optional(),
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
