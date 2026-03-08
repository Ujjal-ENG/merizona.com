"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../_components/ui/button";
import {
  activateVendorPackage,
  approveVendor,
  deactivateVendorPackage,
  suspendVendor,
} from "../../../_services/vendor.service";
import type { Vendor } from "../../../_lib/types";

export function VendorActions({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handle(
    action:
      | "approve"
      | "suspend"
      | "activate-package"
      | "deactivate-package",
  ) {
    setErrorMessage(null);
    setLoading(action);
    try {
      if (action === "approve") await approveVendor(vendor._id);
      else if (action === "suspend") await suspendVendor(vendor._id);
      else if (action === "activate-package") await activateVendorPackage(vendor._id);
      else await deactivateVendorPackage(vendor._id);
      router.refresh();
    } catch (error) {
      const fallback = "Action failed. Please try again.";

      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message) as {
            message?: string | string[];
            error?: string;
          };
          const message = Array.isArray(parsed.message)
            ? parsed.message.join(", ")
            : parsed.message;
          setErrorMessage(message ?? parsed.error ?? fallback);
        } catch {
          setErrorMessage(error.message || fallback);
        }
      } else {
        setErrorMessage(fallback);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2 justify-end">
        {vendor.status === "pending" && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => handle("approve")}
              disabled={loading !== null || vendor.packageStatus !== "active"}
              title={
                vendor.packageStatus !== "active"
                  ? "Activate package first, then approve vendor"
                  : undefined
              }
            >
              {loading === "approve" ? "Approving…" : "Approve"}
            </Button>
            {vendor.packageStatus !== "active" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handle("activate-package")}
                disabled={loading !== null}
              >
                {loading === "activate-package" ? "Enabling…" : "Enable Package"}
              </Button>
            )}
          </>
        )}

        {vendor.status === "approved" && (
          <>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handle("suspend")}
              disabled={loading !== null}
            >
              {loading === "suspend" ? "Suspending…" : "Suspend"}
            </Button>
            {vendor.packageStatus === "active" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handle("deactivate-package")}
                disabled={loading !== null}
              >
                {loading === "deactivate-package" ? "Disabling…" : "Disable Package"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handle("activate-package")}
                disabled={loading !== null}
              >
                {loading === "activate-package" ? "Enabling…" : "Enable Package"}
              </Button>
            )}
          </>
        )}

        {vendor.status === "suspended" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handle("approve")}
            disabled={loading !== null}
          >
            {loading === "approve" ? "Restoring…" : "Restore"}
          </Button>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-destructive text-right">{errorMessage}</p>
      )}
    </div>
  );
}
