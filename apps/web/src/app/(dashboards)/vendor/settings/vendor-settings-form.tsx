"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "../../../_components/ui/button";
import { Input } from "../../../_components/ui/input";
import { Label } from "../../../_components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../_components/ui/card";
import { Badge } from "../../../_components/ui/badge";
import { updateVendorSettings } from "../../../_services/vendor.service";
import { VENDOR_PACKAGE_LABELS, VENDOR_STATUS_LABELS } from "../../../_lib/constants";
import { formatPrice } from "../../../_lib/utils";
import type { Vendor } from "../../../_lib/types";

export function VendorSettingsForm({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [name, setName] = useState(vendor.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await updateVendorSettings({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={vendor.status === "approved" ? "default" : "secondary"}>
                {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commission Rate</p>
              <p className="font-medium">
                {(vendor.commissionRate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Package</p>
              <p className="font-medium">
                {VENDOR_PACKAGE_LABELS[vendor.packageTier] ?? vendor.packageTier} ·{" "}
                {formatPrice(vendor.packagePriceInCents)}/month
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Store Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Store URL</Label>
            <Input value={`merizona.com/stores/${vendor.slug}`} disabled />
          </div>

          {vendor.packageStatus !== "active" && (
            <p className="text-xs text-amber-600">
              Package is inactive. Renew package to run the business.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Legal Name</p>
              <p className="font-medium">{vendor.businessInfo?.legalName ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax ID</p>
              <p className="font-medium">{vendor.businessInfo?.taxId ?? "—"}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            To update business information, contact support.
          </p>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button onClick={handleSave} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {saved ? "Saved!" : "Save Changes"}
      </Button>
    </div>
  );
}
