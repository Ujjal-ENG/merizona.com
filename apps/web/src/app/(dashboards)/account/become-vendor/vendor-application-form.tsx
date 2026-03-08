"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "../../../_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../_components/ui/card";
import { Input } from "../../../_components/ui/input";
import { Label } from "../../../_components/ui/label";
import { Textarea } from "../../../_components/ui/textarea";
import { applyAsVendor } from "../../../_services/vendor.service";
import { formatPrice } from "../../../_lib/utils";

const vendorApplySchema = z.object({
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

type VendorApplyInput = z.infer<typeof vendorApplySchema>;

const PACKAGES: Array<{
  tier: VendorApplyInput["packageTier"];
  title: string;
  priceInCents: number;
  summary: string;
}> = [
  {
    tier: "starter",
    title: "Starter",
    priceInCents: 1999,
    summary: "For new vendors launching their first products",
  },
  {
    tier: "growth",
    title: "Growth",
    priceInCents: 4999,
    summary: "For growing stores with regular order volume",
  },
  {
    tier: "scale",
    title: "Scale",
    priceInCents: 9999,
    summary: "For established vendors with large catalogs",
  },
];

export function VendorApplicationForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VendorApplyInput>({
    resolver: zodResolver(vendorApplySchema),
    defaultValues: {
      packageTier: "starter",
      country: "US",
    },
  });

  const packageTier = watch("packageTier");

  async function onSubmit(values: VendorApplyInput) {
    setServerError(null);
    setServerSuccess(null);

    try {
      await applyAsVendor({
        name: values.name,
        description: values.description,
        businessInfo: {
          legalName: values.legalName,
          taxId: values.taxId,
          address: values.address,
          city: values.city,
          state: values.state,
          country: values.country,
        },
        packageTier: values.packageTier,
      });

      setServerSuccess(
        "Application submitted. Admin approval is required before you can upload products and manage orders.",
      );
      router.refresh();
    } catch {
      setServerError("Could not submit vendor application. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Store Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Store Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" rows={3} {...register("description")} />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input id="legalName" {...register("legalName")} />
              {errors.legalName && (
                <p className="text-xs text-destructive">{errors.legalName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxId">Tax ID (optional)</Label>
              <Input id="taxId" {...register("taxId")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("state")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Package</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PACKAGES.map((pkg) => (
            <label
              key={pkg.tier}
              className={`block rounded-md border p-3 cursor-pointer transition-colors ${
                packageTier === pkg.tier ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{pkg.title}</p>
                  <p className="text-xs text-muted-foreground">{pkg.summary}</p>
                </div>
                <p className="font-semibold">{formatPrice(pkg.priceInCents)}/month</p>
              </div>
              <input
                type="radio"
                value={pkg.tier}
                className="sr-only"
                {...register("packageTier")}
              />
            </label>
          ))}
          {errors.packageTier && (
            <p className="text-xs text-destructive">{errors.packageTier.message}</p>
          )}
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      {serverSuccess && <p className="text-sm text-green-600">{serverSuccess}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Vendor Application
      </Button>
    </form>
  );
}
