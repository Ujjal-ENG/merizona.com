import { getCurrentUser } from "../../../_services/auth.service";
import { AddressCard } from "./address-card";
import { Button } from "../../../_components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Addresses</h1>
          <p className="text-muted-foreground text-sm">
            Manage your shipping addresses
          </p>
        </div>
      </div>

      {user.addresses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No addresses saved yet.</p>
          <p className="text-sm mt-1">
            Addresses are saved automatically during checkout.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {user.addresses.map((address, i) => (
            <AddressCard key={i} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}
