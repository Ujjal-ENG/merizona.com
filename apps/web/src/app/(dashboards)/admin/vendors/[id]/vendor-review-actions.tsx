"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../_components/ui/button";
import { Input } from "../../../../_components/ui/input";
import {
  activateVendorPackage,
  deactivateVendorPackage,
  rejectVendor,
  suspendVendor,
  verifyVendor,
} from "../../../../_services/vendor.service";
import type { Vendor } from "../../../../_lib/types";

export function VendorReviewActions({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(
    vendor.verificationRejectionReason ?? "",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handle(
    action:
      | "verify"
      | "reject"
      | "suspend"
      | "activate-package"
      | "deactivate-package",
  ) {
    setLoading(action);
    setErrorMessage(null);

    try {
      if (action === "verify") {
        await verifyVendor(vendor._id);
      } else if (action === "reject") {
        await rejectVendor(vendor._id, rejectReason);
      } else if (action === "suspend") {
        await suspendVendor(vendor._id);
      } else if (action === "activate-package") {
        await activateVendorPackage(vendor._id);
      } else {
        await deactivateVendorPackage(vendor._id);
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        {vendor.verificationStatus === "submitted" && (
          <>
            <Button
              onClick={() => handle("verify")}
              disabled={loading !== null || vendor.packageStatus !== "active"}
            >
              {loading === "verify" ? "Verifying..." : "Verify Vendor"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handle("reject")}
              disabled={loading !== null || rejectReason.trim().length < 5}
            >
              {loading === "reject" ? "Rejecting..." : "Reject"}
            </Button>
          </>
        )}

        {vendor.packageStatus === "active" ? (
          <Button
            variant="outline"
            onClick={() => handle("deactivate-package")}
            disabled={loading !== null}
          >
            {loading === "deactivate-package" ? "Disabling..." : "Disable Package"}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => handle("activate-package")}
            disabled={loading !== null}
          >
            {loading === "activate-package" ? "Enabling..." : "Enable Package"}
          </Button>
        )}

        {vendor.status === "approved" && (
          <Button
            variant="destructive"
            onClick={() => handle("suspend")}
            disabled={loading !== null}
          >
            {loading === "suspend" ? "Suspending..." : "Suspend"}
          </Button>
        )}
      </div>

      {vendor.verificationStatus === "submitted" && (
        <Input
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder="Rejection reason"
        />
      )}

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
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

  return "Action failed. Please try again.";
}
