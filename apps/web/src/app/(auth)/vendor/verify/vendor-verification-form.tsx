"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, CheckCircle2, FileText } from "lucide-react";
import { Badge } from "../../../_components/ui/badge";
import { Button } from "../../../_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../_components/ui/card";
import { Input } from "../../../_components/ui/input";
import { Label } from "../../../_components/ui/label";
import { Textarea } from "../../../_components/ui/textarea";
import { VENDOR_PACKAGE_LABELS, VENDOR_STATUS_LABELS, VENDOR_VERIFICATION_LABELS } from "../../../_lib/constants";
import {
  vendorVerificationSchema,
  type VendorVerificationInput,
} from "../../../_lib/validations/vendor";
import type { VendorVerificationState } from "../../../_lib/types";
import { submitVendorVerification } from "../../../_services/vendor.service";
import { requestVendorUpload, uploadFileToPresignedUrl } from "../../../_services/uploads.service";
import { formatPrice } from "../../../_lib/utils";

type DocumentType = "business_registration" | "tax_document" | "owner_id";

type UploadState = {
  name: string;
  fileUrl: string;
  downloadUrl?: string;
  progress: number;
  status: "idle" | "uploading" | "uploaded" | "error";
  error?: string;
};

const PACKAGES: Array<{
  tier: VendorVerificationInput["packageTier"];
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

const DOCUMENT_FIELDS: Array<{
  type: DocumentType;
  title: string;
  description: string;
  accept: string;
}> = [
  {
    type: "business_registration",
    title: "Business registration",
    description: "Upload your business registration or trade license",
    accept: ".pdf,image/png,image/jpeg,image/webp",
  },
  {
    type: "tax_document",
    title: "Tax document",
    description: "Upload a tax certificate, registration, or VAT document",
    accept: ".pdf,image/png,image/jpeg,image/webp",
  },
  {
    type: "owner_id",
    title: "Owner ID",
    description: "Upload a government-issued ID for the business owner",
    accept: ".pdf,image/png,image/jpeg,image/webp",
  },
];

export function VendorVerificationForm({
  verification,
}: {
  verification: VendorVerificationState;
}) {
  const router = useRouter();
  const vendor = verification.vendor;
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<DocumentType, UploadState | null>>(
    () => {
      const initial: Record<DocumentType, UploadState | null> = {
        business_registration: null,
        tax_document: null,
        owner_id: null,
      };

      for (const document of vendor?.verificationDocuments ?? []) {
        initial[document.type] = {
          name: document.url.split("/").pop() ?? document.type,
          fileUrl: document.url,
          downloadUrl: document.downloadUrl,
          progress: 100,
          status: "uploaded",
        };
      }

      return initial;
    },
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VendorVerificationInput>({
    resolver: zodResolver(vendorVerificationSchema),
    defaultValues: {
      name: vendor?.name ?? "",
      description: vendor?.description ?? "",
      legalName: vendor?.businessInfo?.legalName ?? "",
      taxId: vendor?.businessInfo?.taxId ?? "",
      address: vendor?.businessInfo?.address ?? "",
      city: vendor?.businessInfo?.city ?? "",
      state: vendor?.businessInfo?.state ?? "",
      country: vendor?.businessInfo?.country ?? "US",
      packageTier: vendor?.packageTier ?? "starter",
    },
  });

  const packageTier = watch("packageTier");
  const isEditable =
    verification.verificationStatus === "not_started" ||
    verification.verificationStatus === "rejected";
  const isSubmitted = verification.verificationStatus === "submitted";
  const isVerified = verification.verificationStatus === "verified";
  const isSuspended = vendor?.status === "suspended";

  async function onSubmit(values: VendorVerificationInput) {
    setFormError(null);
    setSuccessMessage(null);

    const documents = DOCUMENT_FIELDS.map(({ type }) => uploads[type]).filter(
      Boolean,
    ) as UploadState[];

    if (documents.length !== 3) {
      setFormError("Upload all required verification documents before submitting.");
      return;
    }

    try {
      await submitVendorVerification({
        name: values.name.trim(),
        description: values.description?.trim(),
        businessInfo: {
          legalName: values.legalName.trim(),
          taxId: values.taxId?.trim(),
          address: values.address?.trim(),
          city: values.city?.trim(),
          state: values.state?.trim(),
          country: values.country?.trim(),
        },
        packageTier: values.packageTier,
        documents: DOCUMENT_FIELDS.map(({ type }) => ({
          type,
          url: uploads[type]!.fileUrl,
        })),
      });

      setSuccessMessage("Verification submitted. Admin review is now pending.");
      router.refresh();
    } catch (error) {
      setFormError(extractErrorMessage(error));
    }
  }

  async function handleFileSelect(type: DocumentType, file?: File | null) {
    if (!file) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    setUploads((current) => ({
      ...current,
      [type]: {
        name: file.name,
        fileUrl: current[type]?.fileUrl ?? "",
        downloadUrl: current[type]?.downloadUrl,
        progress: 0,
        status: "uploading",
      },
    }));

    try {
      const presigned = await requestVendorUpload({
        purpose: "verification-document",
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });

      await uploadFileToPresignedUrl(file, presigned.uploadUrl, (progress) => {
        setUploads((current) => ({
          ...current,
          [type]: {
            ...(current[type] ?? {
              name: file.name,
              fileUrl: "",
              status: "uploading",
            }),
            name: file.name,
            fileUrl: current[type]?.fileUrl ?? "",
            progress,
            status: "uploading",
          },
        }));
      });

      setUploads((current) => ({
        ...current,
        [type]: {
          name: file.name,
          fileUrl: presigned.fileUrl,
          progress: 100,
          status: "uploaded",
        },
      }));
    } catch (error) {
      setUploads((current) => ({
        ...current,
        [type]: {
          name: file.name,
          fileUrl: current[type]?.fileUrl ?? "",
          downloadUrl: current[type]?.downloadUrl,
          progress: 0,
          status: "error",
          error: extractErrorMessage(error),
        },
      }));
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={isVerified ? "default" : isSubmitted ? "secondary" : "outline"}>
              {VENDOR_VERIFICATION_LABELS[verification.verificationStatus]}
            </Badge>
            {vendor && (
              <Badge
                variant={
                  vendor.status === "approved"
                    ? "default"
                    : vendor.status === "suspended"
                      ? "destructive"
                      : "secondary"
                }
              >
                {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
              </Badge>
            )}
            {vendor && (
              <span className="text-sm text-muted-foreground">
                Package: {VENDOR_PACKAGE_LABELS[vendor.packageTier]} ·{" "}
                {formatPrice(vendor.packagePriceInCents)}/month
              </span>
            )}
          </div>

          {isSubmitted && (
            <p className="text-sm text-muted-foreground">
              Your business verification is under admin review. Products and orders
              will unlock after verification and active package approval.
            </p>
          )}

          {vendor?.verificationRejectionReason && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Rejected:</strong> {vendor.verificationRejectionReason}
            </div>
          )}

          {vendor?.packageStatus !== "active" && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              Your package is inactive. Vendor dashboard access stays blocked until
              the package is active.
            </div>
          )}

          {isSuspended && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              This vendor account is suspended. Contact support to continue.
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Store Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Store Name</Label>
              <Input id="name" disabled={!isEditable || isSuspended} {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                disabled={!isEditable || isSuspended}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  disabled={!isEditable || isSuspended}
                  {...register("legalName")}
                />
                {errors.legalName && (
                  <p className="text-xs text-destructive">{errors.legalName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  disabled={!isEditable || isSuspended}
                  {...register("taxId")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  disabled={!isEditable || isSuspended}
                  {...register("address")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  disabled={!isEditable || isSuspended}
                  {...register("city")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  disabled={!isEditable || isSuspended}
                  {...register("state")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  disabled={!isEditable || isSuspended}
                  {...register("country")}
                />
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
                className={`block rounded-md border p-3 ${
                  !isEditable || isSuspended ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                } ${
                  packageTier === pkg.tier
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40"
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
                  disabled={!isEditable || isSuspended}
                  {...register("packageTier")}
                />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DOCUMENT_FIELDS.map((field) => {
              const upload = uploads[field.type];
              return (
                <div
                  key={field.type}
                  className="rounded-md border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{field.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {field.description}
                      </p>
                    </div>
                    {upload?.status === "uploaded" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept={field.accept}
                        className="hidden"
                        disabled={!isEditable || isSuspended}
                        onChange={(event) =>
                          handleFileSelect(field.type, event.target.files?.[0] ?? null)
                        }
                      />
                      <span
                        className={`inline-flex items-center rounded-md border px-3 py-2 text-sm ${
                          !isEditable || isSuspended
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:bg-muted"
                        }`}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {upload?.status === "uploaded" ? "Replace file" : "Upload file"}
                      </span>
                    </label>

                    {upload?.downloadUrl && (
                      <a
                        href={upload.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View current file
                      </a>
                    )}
                  </div>

                  {upload && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{upload.name}</span>
                        <span className="text-muted-foreground">
                          {upload.status === "uploading"
                            ? `${upload.progress}%`
                            : upload.status === "uploaded"
                              ? "Uploaded"
                              : upload.status === "error"
                                ? "Failed"
                                : ""}
                        </span>
                      </div>
                      {upload.status === "uploading" && (
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      )}
                      {upload.error && (
                        <p className="text-xs text-destructive">{upload.error}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {formError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </div>
        )}

        {successMessage && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {isEditable && !isSuspended && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {verification.verificationStatus === "rejected"
              ? "Resubmit Verification"
              : "Submit Verification"}
          </Button>
        )}
      </form>
    </div>
  );
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as {
        message?: string | string[];
      };
      if (Array.isArray(parsed.message)) {
        return parsed.message.join(", ");
      }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      return error.message;
    }
  }

  return "Something went wrong. Please try again.";
}
