import { redirect } from "next/navigation";
import { getCurrentUser } from "../../_services/auth.service";
import { Sidebar } from "../../_components/sidebar";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        variant="account"
        userName={`${user.profile.firstName} ${user.profile.lastName}`}
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
