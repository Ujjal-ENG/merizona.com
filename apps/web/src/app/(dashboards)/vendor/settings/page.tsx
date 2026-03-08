import { getMyVendorProfile } from "../../../_services/vendor.service";
import { VendorSettingsForm } from "./vendor-settings-form";

export const dynamic = "force-dynamic";

export default async function VendorSettingsPage() {
  const vendor = await getMyVendorProfile().catch(() => null);

  if (!vendor) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Store Settings</h1>
        <p className="text-muted-foreground">
          Could not load vendor profile. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Store Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your store details and business information
        </p>
      </div>
      <VendorSettingsForm vendor={vendor} />
    </div>
  );
}
