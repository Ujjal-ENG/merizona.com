import Link from "next/link";
import { Store, Star, MessageSquare, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../_components/ui/card";
import { Input } from "../../_components/ui/input";
import { Button } from "../../_components/ui/button";
import { Badge } from "../../_components/ui/badge";
import { getPublicVendors } from "../../_services/vendor.service";

export const dynamic = "force-dynamic";

interface VendorsSearchParams {
  page?: string;
  search?: string;
  sort?: "createdAt" | "updatedAt" | "name";
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<VendorsSearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { data: vendors, total } = await getPublicVendors({
    page,
    limit: 20,
    search: params.search,
    sort: params.sort ?? "createdAt",
  }).catch(() => ({ data: [], total: 0, page: 1, limit: 20 }));

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vendor Stores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover trusted sellers across the marketplace.
        </p>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-3 gap-3" method="get">
        <Input
          name="search"
          placeholder="Search by vendor, city, country..."
          defaultValue={params.search ?? ""}
          className="md:col-span-2"
        />
        <div className="flex gap-2">
          <select
            name="sort"
            defaultValue={params.sort ?? "createdAt"}
            className="h-10 rounded-md border bg-background px-3 text-sm w-full"
          >
            <option value="createdAt">Newest</option>
            <option value="updatedAt">Recently Updated</option>
            <option value="name">Name A-Z</option>
          </select>
          <Button type="submit">Apply</Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        {total} vendor{total !== 1 ? "s" : ""}
      </p>

      {vendors.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No vendors found for your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <Card key={vendor._id} className="h-full">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg leading-tight">{vendor.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {vendor.businessInfo?.city
                        ? `${vendor.businessInfo.city}${
                            vendor.businessInfo.country
                              ? `, ${vendor.businessInfo.country}`
                              : ""
                          }`
                        : vendor.businessInfo?.country ?? "Global store"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <Store className="h-3 w-3 mr-1" />
                    Seller
                  </Badge>
                </div>
                {vendor.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {vendor.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md border p-2 text-center">
                    <Package className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-semibold">{vendor.stats.productCount}</p>
                    <p className="text-muted-foreground">Products</p>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <Star className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-semibold">{vendor.stats.avgRating.toFixed(1)}</p>
                    <p className="text-muted-foreground">Rating</p>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <MessageSquare className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-semibold">{vendor.stats.reviewCount}</p>
                    <p className="text-muted-foreground">Reviews</p>
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link href={`/vendors/${vendor.slug}`}>Visit Store</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
