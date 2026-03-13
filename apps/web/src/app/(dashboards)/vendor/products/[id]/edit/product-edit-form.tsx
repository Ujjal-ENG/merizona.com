"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "../../../../../_components/ui/button";
import { Input } from "../../../../../_components/ui/input";
import { Label } from "../../../../../_components/ui/label";
import { Textarea } from "../../../../../_components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../_components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../_components/ui/select";
import { ApiError } from "../../../../../_services/api-client";
import { updateProduct } from "../../../../../_services/catalog.service";
import type { Product } from "../../../../../_lib/types";

const productEditFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be at most 5000 characters"),
  status: z.enum(["draft", "published", "archived"]),
});

type ProductEditFormInput = z.infer<typeof productEditFormSchema>;

export function ProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductEditFormInput>({
    resolver: zodResolver(productEditFormSchema),
    defaultValues: {
      title: product.title,
      description: product.description ?? "",
      status: product.status,
    },
  });

  const currentStatus = watch("status");

  async function onSubmit(data: ProductEditFormInput) {
    setError(null);
    try {
      await updateProduct(product._id, {
        title: data.title.trim(),
        description: data.description.trim(),
        status: data.status,
      });
      router.push("/vendor/products");
      router.refresh();
    } catch (submitError) {
      setError(resolveProductUpdateError(submitError));
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
            <Textarea
              id="description"
              rows={5}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <input type="hidden" {...register("status")} />
            <Select
              value={currentStatus}
              onValueChange={(v) =>
                setValue("status", v as ProductEditFormInput["status"], {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          Save Changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function resolveProductUpdateError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        return parsed.message.join(", ");
      }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      if (error.message) {
        return error.message;
      }
    }
  }

  return "Failed to update product. Please try again.";
}
