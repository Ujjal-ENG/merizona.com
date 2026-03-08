import { getCurrentUser } from "../../_services/auth.service";
import Link from "next/link";
import { Button } from "../../_components/ui/button";
import { ProfileForm } from "./profile-form";

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/account/become-vendor">Become Vendor</Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">{user.email}</p>
      <ProfileForm user={user} />
    </div>
  );
}
