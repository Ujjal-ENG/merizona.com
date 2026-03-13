import Link from "next/link";

export default function VendorAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Vendor Portal
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Sell on Merizona</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dedicated seller accounts use{" "}
          <Link href="/vendor/login" className="text-primary hover:underline">
            vendor login
          </Link>{" "}
          and complete business verification before products go live.
        </p>
      </div>
      {children}
    </div>
  );
}
