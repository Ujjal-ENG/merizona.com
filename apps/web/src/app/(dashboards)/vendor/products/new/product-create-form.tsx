"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../../../_components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../_components/ui/card";
import { Input } from "../../../../_components/ui/input";
import { Label } from "../../../../_components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../_components/ui/tabs";
import { Textarea } from "../../../../_components/ui/textarea";
import { createProductSchema } from "../../../../_lib/validations/product";
import { createProduct } from "../../../../_services/catalog.service";

const productCreateFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categoryInput: z.string().min(1, "Enter at least one category"),
  tagsInput: z.string().optional(),
  attributes: z.array(z.object({ key: z.string(), value: z.string() })),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1, "SKU is required"),
        label: z.string().min(1, "Label is required"),
        priceInCents: z.coerce
          .number()
          .int()
          .positive("Price must be positive"),
        attributes: z
          .array(z.object({ key: z.string(), value: z.string() }))
          .default([]),
      }),
    )
    .min(1, "At least one variant is required"),
});

type ProductCreateFormValues = z.infer<typeof productCreateFormSchema>;
type ProductSubmitAction = "draft" | "published";

const STEPS = ["basic", "attributes", "variants", "review"] as const;
type Step = (typeof STEPS)[number];

function splitCommaList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProductCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<Step>("basic");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
    getValues,
  } = useForm<ProductCreateFormValues>({
    resolver: zodResolver(productCreateFormSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryInput: "",
      tagsInput: "",
      attributes: [{ key: "", value: "" }],
      variants: [
        { sku: "", label: "Default", priceInCents: 1000, attributes: [] },
      ],
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

  async function moveToNextStep() {
    let fieldsToValidate: any[] = [];
    if (activeStep === "basic") {
      fieldsToValidate = ["title", "description", "categoryInput"];
    } else if (activeStep === "attributes") {
      fieldsToValidate = ["attributes"];
    } else if (activeStep === "variants") {
      fieldsToValidate = ["variants"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (!isValid) return;

    const currentIndex = STEPS.indexOf(activeStep);
    if (currentIndex < STEPS.length - 1) {
      setActiveStep(STEPS[currentIndex + 1]);
    }
  }

  function moveToPrevStep() {
    const currentIndex = STEPS.indexOf(activeStep);
    if (currentIndex > 0) {
      setActiveStep(STEPS[currentIndex - 1]);
    }
  }

  async function onSubmit(action: ProductSubmitAction) {
    setError(null);
    const isValid = await trigger();
    if (!isValid) {
      setError("Please fix the validation errors before submitting.");
      return;
    }

    const values = getValues();
    try {
      const attributes = Object.fromEntries(
        values.attributes
          .map((attr) => ({ key: attr.key.trim(), value: attr.value.trim() }))
          .filter((attr) => attr.key && attr.value)
          .map((attr) => [attr.key, attr.value]),
      );

      const payload = createProductSchema.parse({
        title: values.title.trim(),
        description: values.description.trim(),
        category: splitCommaList(values.categoryInput),
        attributes,
        variants: values.variants.map((v) => ({
          sku: v.sku.trim(),
          label: v.label.trim(),
          priceInCents: v.priceInCents,
          attributes: Object.fromEntries(
            v.attributes
              .map((a) => ({ key: a.key.trim(), value: a.value.trim() }))
              .filter((a) => a.key && a.value)
              .map((a) => [a.key, a.value]),
          ),
        })),
        status: action,
        tags: splitCommaList(values.tagsInput),
      });

      await createProduct(payload);
      router.push("/vendor/products");
      router.refresh();
    } catch {
      setError(`Failed to save product as ${action}. Please try again.`);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeStep} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" disabled>
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="attributes" disabled>
            Attributes
          </TabsTrigger>
          <TabsTrigger value="variants" disabled>
            Variants
          </TabsTrigger>
          <TabsTrigger value="review" disabled>
            Review & Publish
          </TabsTrigger>
        </TabsList>

        <form className="mt-6 space-y-6">
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Start by providing the core details of your product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...register("title")} />
                  {errors.title && (
                    <p className="text-xs text-destructive">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="categoryInput">
                      Categories (comma separated)
                    </Label>
                    <Input
                      id="categoryInput"
                      placeholder="Electronics, Audio"
                      {...register("categoryInput")}
                    />
                    {errors.categoryInput && (
                      <p className="text-xs text-destructive">
                        {errors.categoryInput.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tagsInput">Tags (comma separated)</Label>
                    <Input
                      id="tagsInput"
                      placeholder="headphones, wireless"
                      {...register("tagsInput")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attributes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Global Attributes</CardTitle>
                  <CardDescription>
                    Add defining characteristics that apply to all variants of
                    this product.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendAttribute({ key: "", value: "" })}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Attribute
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {attributeFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <Input
                      placeholder="Key (e.g. Brand)"
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
          </TabsContent>

          <TabsContent value="variants">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Product Variants</CardTitle>
                  <CardDescription>
                    Define the different options available for this product,
                    such as size or color.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendVariant({
                      sku: "",
                      label: "",
                      priceInCents: 1000,
                      attributes: [],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Variant
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {variantFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-4 rounded-md border p-4"
                  >
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
                        <Input
                          {...register(`variants.${index}.sku`)}
                          placeholder="SKU-001"
                        />
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
                    {/* Note: In a full app you might allow per-variant attributes dynamically here too */}
                  </div>
                ))}
                {errors.variants?.root?.message && (
                  <p className="text-xs text-destructive">
                    {errors.variants.root.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>Review & Publish</CardTitle>
                <CardDescription>
                  Almost done! Review your product details before creating it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium text-sm mb-2">Summary</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>{getValues("title") || "No Title"}</li>
                    <li>
                      {getValues("categoryInput").split(",").length || 0}{" "}
                      Categories
                    </li>
                    <li>{getValues("variants").length} defined variants</li>
                    <li>
                      Images can be uploaded from the product edit screen after
                      saving.
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={
                activeStep === "basic" ? () => router.back() : moveToPrevStep
              }
              disabled={isSubmitting}
            >
              {activeStep === "basic" ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </>
              )}
            </Button>

            {activeStep !== "review" ? (
              <Button type="button" onClick={moveToNextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onSubmit("draft")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Save as Draft"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => onSubmit("published")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Publish Product"
                  )}
                </Button>
              </div>
            )}
          </div>
        </form>
      </Tabs>
    </div>
  );
}
