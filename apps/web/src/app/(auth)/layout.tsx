import Link from "next/link";
import { Package } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-xl text-primary mb-8"
      >
        <Package className="h-6 w-6" />
        Merizona
      </Link>
      <div className="w-full max-w-5xl">{children}</div>
    </div>
  );
}
