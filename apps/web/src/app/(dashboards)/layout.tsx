import { redirect } from "next/navigation";
import { getCurrentUser } from "../_services/auth.service";

export default async function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
