import { Navbar } from "../_components/navbar";
import { getCurrentUser } from "../_services/auth.service";
import { getMyVendorProfile } from "../_services/vendor.service";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  let dashboardHref = "/account";

  if (user?.role === "platform_admin") {
    dashboardHref = "/admin";
  } else if (user) {
    const vendor = await getMyVendorProfile().catch(() => null);

    if (vendor && vendor.status === "approved" && vendor.packageStatus === "active") {
      dashboardHref = "/vendor";
    } else if (vendor) {
      dashboardHref = "/account/become-vendor";
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} dashboardHref={dashboardHref} />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Merizona. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
