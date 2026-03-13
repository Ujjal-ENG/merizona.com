import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../_services/auth.service";
import { getVendorVerification } from "../../../_services/vendor.service";
import { VendorVerificationForm } from "./vendor-verification-form";

export const dynamic = "force-dynamic";

export default async function VendorVerifyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/vendor/login");
  }

  if (user.role !== "vendor") {
    redirect(user.role === "platform_admin" ? "/admin" : "/account");
  }

  const verification = await getVendorVerification().catch(() => ({
    vendor: null,
    verificationStatus: "not_started" as const,
    canAccessDashboard: false,
  }));

  if (verification.canAccessDashboard) {
    redirect("/vendor");
  }

  return <VendorVerificationForm verification={verification} />;
}
