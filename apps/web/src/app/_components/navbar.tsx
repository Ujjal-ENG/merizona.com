"use client";

import Link from "next/link";
import { ShoppingCart, User, Package } from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "../_hooks/use-cart";
import type { User as UserType } from "../_lib/types";

interface NavbarProps {
  user?: Pick<UserType, "_id" | "email" | "role" | "profile"> | null;
  dashboardHref?: string;
}

export function Navbar({ user, dashboardHref }: NavbarProps) {
  const totalItems = useCart((state) => state.totalItems());

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-primary"
        >
          <Package className="h-6 w-6" />
          Merizona
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/products"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Products
          </Link>
          <Link
            href="/vendors"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Vendors
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
              <span className="sr-only">Cart ({totalItems} items)</span>
            </Link>
          </Button>

          {user ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={dashboardHref ?? "/account"}>
                <User className="h-4 w-4 mr-2" />
                {user.profile.firstName}
              </Link>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
