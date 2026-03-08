"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "../../../../_components/ui/button";
import { Input } from "../../../../_components/ui/input";
import { Label } from "../../../../_components/ui/label";
import { Textarea } from "../../../../_components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../_components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../_components/ui/select";
import { createProduct } from "../../../../_services/catalog.service";
import { createProductSchema } from "../../../../_lib/validations/product";

const productCreateFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["draft", "published"]),
  categoryInput: z.string().min(1, "Enter at least one category"),
  tagsInput: z.string().optional(),
  attributes: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    }),
  ),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1, "SKU is required"),
        label: z.string().min(1, "Label is required"),
        priceInCents: z.coerce.number().int().positive("Price must be positive"),
        imagesInput: z.string().optional(),
      }),
    )
    .min(1, "At least one variant is required"),
});

type ProductCreateFormValues = z.infer<typeof productCreateFormSchema>;

function splitCommaList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitImageList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProductCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductCreateFormValues>({
    resolver: zodResolver(productCreateFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "draft",
      categoryInput: "",
      tagsInput: "",
      attributes: [{ key: "", value: "" }],
      variants: [{ sku: "", label: "Default", priceInCents: 1000, imagesInput: "" }],
    },
  });

  const {
    fields: attributeFields,
    append: appendAttribute,
    remove: removeAttribute,
  } = useFieldArray({
    control,
    name: "attributes",
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: "variants",
  });

  const currentStatus = watch("status");

  async function onSubmit(values: ProductCreateFormValues) {
    setError(null);

    try {
      const attributes = Object.fromEntries(
        values.attributes
          .map((attr) => ({
            key: attr.key.trim(),
            value: attr.value.trim(),
          }))
          .filter((attr) => attr.key && attr.value)
          .map((attr) => [attr.key, attr.value]),
      );

      const payload = createProductSchema.parse({
        title: values.title.trim(),
        description: values.description.trim(),
        category: splitCommaList(values.categoryInput),
        attributes,
        variants: values.variants.map((variant) => ({
          sku: variant.sku.trim(),
          label: variant.label.trim(),
          priceInCents: variant.priceInCents,
          images: splitImageList(variant.imagesInput),
        })),
        status: values.status,
        tags: splitCommaList(values.tagsInput),
      });

      await createProduct(payload);
      router.push("/vendor/products");
      router.refresh();
    } catch {
      setError("Failed to create product. Check fields and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...register("description")} />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="categoryInput">Categories</Label>
              <Input
                id="categoryInput"
                placeholder="Electronics, Audio"
                {...register("categoryInput")}
              />
              {errors.categoryInput && (
                <p className="text-xs text-destructive">{errors.categoryInput.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tagsInput">Tags</Label>
              <Input
                id="tagsInput"
                placeholder="headphones, wireless"
                {...register("tagsInput")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={currentStatus}
              onValueChange={(value) =>
                setValue("status", value as "draft" | "published", {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Attributes</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendAttribute({ key: "", value: "" })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Attribute
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {attributeFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
              <Input
                placeholder="Key (e.g. brand)"
                {...register(`attributes.${index}.key`)}
              />
              <Input
                placeholder="Value (e.g. Sony)"
                {...register(`attributes.${index}.value`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAttribute(index)}
                disabled={attributeFields.length === 1}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Variants</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendVariant({
                sku: "",
                label: "",
                priceInCents: 1000,
                imagesInput: "",
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Variant
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {variantFields.map((field, index) => (
            <div key={field.id} className="rounded-md border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">Variant {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeVariant(index)}
                  disabled={variantFields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>SKU</Label>
                  <Input {...register(`variants.${index}.sku`)} placeholder="SKU-001" />
                  {errors.variants?.[index]?.sku && (
                    <p className="text-xs text-destructive">
                      {errors.variants[index]?.sku?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input
                    {...register(`variants.${index}.label`)}
                    placeholder="Black / Medium"
                  />
                  {errors.variants?.[index]?.label && (
                    <p className="text-xs text-destructive">
                      {errors.variants[index]?.label?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Price (cents)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    {...register(`variants.${index}.priceInCents`, {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.variants?.[index]?.priceInCents && (
                    <p className="text-xs text-destructive">
                      {errors.variants[index]?.priceInCents?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Image URLs</Label>
                <Textarea
                  rows={2}
                  placeholder="https://... (comma or newline separated)"
                  {...register(`variants.${index}.imagesInput`)}
                />
              </div>
            </div>
          ))}

          {errors.variants?.message && (
            <p className="text-xs text-destructive">{errors.variants.message}</p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Product
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/vendor/products")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
