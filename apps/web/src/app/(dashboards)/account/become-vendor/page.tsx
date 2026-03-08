import Link from "next/link";
import { getMyVendorProfile } from "../../../_services/vendor.service";
import { Badge } from "../../../_components/ui/badge";
import { Button } from "../../../_components/ui/button";
import { VENDOR_PACKAGE_LABELS, VENDOR_STATUS_LABELS } from "../../../_lib/constants";
import { formatPrice } from "../../../_lib/utils";
import { VendorApplicationForm } from "./vendor-application-form";

export const dynamic = "force-dynamic";

interface BecomeVendorPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function BecomeVendorPage({ searchParams }: BecomeVendorPageProps) {
  const params = await searchParams;
  const vendor = await getMyVendorProfile().catch(() => null);

  if (vendor) {
    const canOperate = vendor.status === "approved" && vendor.packageStatus === "active";

    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Vendor Onboarding</h1>
          <p className="text-muted-foreground text-sm">
            Vendors use the same login and registration pages. Business access starts after admin approval.
          </p>
        </div>

        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{vendor.name}</p>
              <p className="text-xs text-muted-foreground">{vendor.slug}</p>
            </div>
            <Badge variant={vendor.status === "approved" ? "default" : vendor.status === "pending" ? "secondary" : "destructive"}>
              {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Package: <span className="font-medium text-foreground">{VENDOR_PACKAGE_LABELS[vendor.packageTier] ?? vendor.packageTier}</span>{" "}
            ({formatPrice(vendor.packagePriceInCents)}/month)
          </p>

          {vendor.packageStatus !== "active" && (
            <p className="text-sm text-amber-600">
              Package is inactive. Please renew your package to run the business.
            </p>
          )}

          {vendor.status === "pending" && (
            <p className="text-sm text-muted-foreground">
              Your application is under review. You will be able to upload products and manage orders after admin approval.
            </p>
          )}

          {vendor.status === "suspended" && (
            <p className="text-sm text-destructive">
              Your vendor account is suspended. Contact support to restore business access.
            </p>
          )}

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/account">Back to Account</Link>
            </Button>
            {canOperate && (
              <Button asChild>
                <Link href="/vendor">Go to Vendor Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Become a Vendor</h1>
        <p className="text-muted-foreground text-sm">
          Use your current account to apply as a vendor. Select a package, submit details, and wait for admin approval before running the business.
        </p>
        {params.status && (
          <p className="text-xs text-amber-600 mt-2">
            Access is restricted until approval and active package.
          </p>
        )}
      </div>

      <VendorApplicationForm />
    </div>
  );
}
