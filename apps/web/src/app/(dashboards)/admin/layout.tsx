import { redirect } from "next/navigation";
import { getCurrentUser } from "../../_services/auth.service";
import { Sidebar } from "../../_components/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "platform_admin") redirect("/");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        variant="admin"
        userName={`${user.profile.firstName} ${user.profile.lastName}`}
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
