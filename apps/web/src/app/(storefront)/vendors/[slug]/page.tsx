import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, MessageSquare, Package, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { ProductCard } from "../../../_components/product-card";
import { Button } from "../../../_components/ui/button";
import { Input } from "../../../_components/ui/input";
import { Badge } from "../../../_components/ui/badge";
import { getProducts } from "../../../_services/catalog.service";
import { getPublicVendorBySlug } from "../../../_services/vendor.service";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; sort?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const vendor = await getPublicVendorBySlug(slug);
    return {
      title: `${vendor.name} Store`,
      description:
        vendor.description ??
        `Browse products from ${vendor.name} on Merizona marketplace.`,
    };
  } catch {
    return { title: "Vendor not found" };
  }
}

export default async function VendorStorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const page = Number(query.page ?? 1);

  const vendor = await getPublicVendorBySlug(slug).catch(() => null);
  if (!vendor) {
    notFound();
  }

  const { data: products, total } = await getProducts({
    page,
    limit: 24,
    vendorSlug: slug,
    search: query.search,
    sort:
      query.sort === "price" ||
      query.sort === "rating" ||
      query.sort === "reviewCount" ||
      query.sort === "title" ||
      query.sort === "updatedAt" ||
      query.sort === "createdAt"
        ? query.sort
        : "createdAt",
  }).catch(() => ({ data: [], total: 0, page: 1, limit: 24 }));

  return (
    <div className="container py-8 space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="pl-0">
          <Link href="/vendors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to vendors
          </Link>
        </Button>

        <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{vendor.name}</h1>
                <Badge variant="secondary">Verified Seller</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {vendor.description ?? "Trusted marketplace seller."}
              </p>
              {(vendor.businessInfo?.city || vendor.businessInfo?.country) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {vendor.businessInfo?.city
                    ? `${vendor.businessInfo.city}${
                        vendor.businessInfo.country
                          ? `, ${vendor.businessInfo.country}`
                          : ""
                      }`
                    : vendor.businessInfo?.country}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 min-w-[240px]">
              <div className="rounded-md border bg-background p-2 text-center">
                <Package className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold text-sm">{vendor.stats.productCount}</p>
                <p className="text-[11px] text-muted-foreground">Products</p>
              </div>
              <div className="rounded-md border bg-background p-2 text-center">
                <Star className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold text-sm">{vendor.stats.avgRating.toFixed(1)}</p>
                <p className="text-[11px] text-muted-foreground">Rating</p>
              </div>
              <div className="rounded-md border bg-background p-2 text-center">
                <MessageSquare className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="font-semibold text-sm">{vendor.stats.reviewCount}</p>
                <p className="text-[11px] text-muted-foreground">Reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Store Products</h2>
            <p className="text-sm text-muted-foreground">
              {total} product{total !== 1 ? "s" : ""}
            </p>
          </div>

          <form method="get" className="flex gap-2 w-full sm:w-auto">
            <Input
              name="search"
              defaultValue={query.search ?? ""}
              placeholder="Search this store"
              className="sm:w-64"
            />
            <select
              name="sort"
              defaultValue={query.sort ?? "createdAt"}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="createdAt">Newest</option>
              <option value="price">Price</option>
              <option value="rating">Top Rated</option>
              <option value="reviewCount">Most Reviewed</option>
              <option value="title">Title</option>
            </select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            No products found for this store.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
