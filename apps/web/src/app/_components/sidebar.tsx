"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Store,
  Settings,
  BarChart3,
  Boxes,
  MapPin,
  LogOut,
} from "lucide-react";
import { cn } from "../_lib/utils";
import { Button } from "./ui/button";
import { logoutAction } from "../_services/auth.service";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
];

const VENDOR_NAV: NavItem[] = [
  { href: "/vendor", label: "Dashboard", icon: BarChart3 },
  { href: "/vendor/products", label: "Products", icon: Package },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingBag },
  { href: "/vendor/inventory", label: "Inventory", icon: Boxes },
  { href: "/vendor/settings", label: "Settings", icon: Settings },
];

const ACCOUNT_NAV: NavItem[] = [
  { href: "/account", label: "Profile", icon: Users },
  { href: "/account/orders", label: "Orders", icon: ShoppingBag },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/become-vendor", label: "Become Vendor", icon: Store },
];

interface SidebarProps {
  variant: "admin" | "vendor" | "account";
  userName?: string;
}

export function Sidebar({ variant, userName }: SidebarProps) {
  const pathname = usePathname();
  const navItems =
    variant === "admin"
      ? ADMIN_NAV
      : variant === "vendor"
        ? VENDOR_NAV
        : ACCOUNT_NAV;

  const title =
    variant === "admin"
      ? "Admin Console"
      : variant === "vendor"
        ? "Vendor Console"
        : "My Account";

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold text-sm">{title}</span>
      </div>

      {userName && (
        <div className="px-4 py-3 text-xs text-muted-foreground border-b">
          {userName}
        </div>
      )}

      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === `/${variant}`
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
