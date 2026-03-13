"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../_components/ui/button";
import {
  activateVendorPackage,
  deactivateVendorPackage,
  suspendVendor,
} from "../../../_services/vendor.service";
import type { Vendor } from "../../../_lib/types";

export function VendorActions({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handle(
    action: "suspend" | "activate-package" | "deactivate-package",
  ) {
    setErrorMessage(null);
    setLoading(action);
    try {
      if (action === "suspend") await suspendVendor(vendor._id);
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
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/vendors/${vendor._id}`}>Review</Link>
        </Button>

        {vendor.status !== "suspended" && (
          <>
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
            {vendor.status === "approved" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handle("suspend")}
                disabled={loading !== null}
              >
                {loading === "suspend" ? "Suspending…" : "Suspend"}
              </Button>
            )}
          </>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-destructive text-right">{errorMessage}</p>
      )}
    </div>
  );
}
