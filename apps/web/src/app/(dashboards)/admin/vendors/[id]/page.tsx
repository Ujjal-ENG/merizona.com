import { notFound } from "next/navigation";
import { Badge } from "../../../../_components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../_components/ui/card";
import { getAdminVendorById } from "../../../../_services/vendor.service";
import {
  VENDOR_PACKAGE_LABELS,
  VENDOR_STATUS_LABELS,
  VENDOR_VERIFICATION_LABELS,
} from "../../../../_lib/constants";
import { formatDate, formatPrice } from "../../../../_lib/utils";
import { VendorReviewActions } from "./vendor-review-actions";

export const dynamic = "force-dynamic";

export default async function AdminVendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await getAdminVendorById(id).catch(() => null);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">{vendor.slug}</p>
        </div>
        <VendorReviewActions vendor={vendor} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-3">
              <Badge variant={vendor.status === "approved" ? "default" : vendor.status === "suspended" ? "destructive" : "secondary"}>
                {VENDOR_STATUS_LABELS[vendor.status]}
              </Badge>
              <Badge
                variant={
                  vendor.verificationStatus === "verified"
                    ? "default"
                    : vendor.verificationStatus === "rejected"
                      ? "destructive"
                      : "secondary"
                }
              >
                {VENDOR_VERIFICATION_LABELS[vendor.verificationStatus]}
              </Badge>
              <Badge variant={vendor.packageStatus === "active" ? "default" : "outline"}>
                Package {vendor.packageStatus}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Joined</p>
                <p className="font-medium">{formatDate(vendor.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {vendor.verificationSubmittedAt
                    ? formatDate(vendor.verificationSubmittedAt)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Reviewed</p>
                <p className="font-medium">
                  {vendor.verificationReviewedAt
                    ? formatDate(vendor.verificationReviewedAt)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Package</p>
                <p className="font-medium">
                  {VENDOR_PACKAGE_LABELS[vendor.packageTier]} ·{" "}
                  {formatPrice(vendor.packagePriceInCents)}/month
                </p>
              </div>
            </div>

            {vendor.verificationRejectionReason && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Latest rejection:</strong> {vendor.verificationRejectionReason}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Legal Name</p>
              <p className="font-medium">{vendor.businessInfo?.legalName ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax ID</p>
              <p className="font-medium">{vendor.businessInfo?.taxId ?? "—"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">
                {[
                  vendor.businessInfo?.address,
                  vendor.businessInfo?.city,
                  vendor.businessInfo?.state,
                  vendor.businessInfo?.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Description</p>
              <p className="font-medium">{vendor.description || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Documents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {vendor.verificationDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verification documents uploaded.</p>
          ) : (
            vendor.verificationDocuments.map((document) => (
              <div key={document.type} className="rounded-md border p-4">
                <p className="font-medium capitalize">
                  {document.type.replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground break-all">
                  {document.url}
                </p>
                <a
                  href={document.downloadUrl ?? document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                  Open document
                </a>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
