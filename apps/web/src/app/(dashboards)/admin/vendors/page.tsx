import { getAdminVendors } from "../../../_services/vendor.service";
import { Badge } from "../../../_components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../_components/ui/table";
import { formatDate, formatPrice } from "../../../_lib/utils";
import {
  VENDOR_PACKAGE_LABELS,
  VENDOR_STATUS_LABELS,
  VENDOR_VERIFICATION_LABELS,
} from "../../../_lib/constants";
import { VendorActions } from "./vendor-actions";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const { data: vendors, total } = await getAdminVendors(
    page,
    20,
    params.status,
  ).catch(() => ({ data: [], total: 0, page: 1, limit: 20 }));

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    approved: "default",
    pending: "secondary",
    suspended: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vendors</h1>
        <p className="text-muted-foreground text-sm">{total} total vendors</p>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "approved", "suspended"].map((s) => (
          <a
            key={s}
            href={`/admin/vendors${s !== "all" ? `?status=${s}` : ""}`}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              (params.status ?? "all") === s
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Legal Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                  No vendors found.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.slug}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {vendor.businessInfo?.legalName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[vendor.status] ?? "outline"}>
                      {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-sm">
                    {VENDOR_PACKAGE_LABELS[vendor.packageTier] ?? vendor.packageTier}
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(vendor.packagePriceInCents)}/month •{" "}
                      <span className="capitalize">{vendor.packageStatus}</span>
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {(vendor.commissionRate * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(vendor.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <VendorActions vendor={vendor} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
