import { redirect } from "next/navigation";
import { getCurrentUser } from "../../_services/auth.service";
import { getMyVendorProfile } from "../../_services/vendor.service";
import { Sidebar } from "../../_components/sidebar";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const vendor = await getMyVendorProfile().catch(() => null);
  if (!vendor) {
    redirect("/account/become-vendor");
  }

  if (vendor.status !== "approved" || vendor.packageStatus !== "active") {
    redirect(
      `/account/become-vendor?status=${encodeURIComponent(vendor.status)}`,
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        variant="vendor"
        userName={`${user.profile.firstName} ${user.profile.lastName}`}
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
