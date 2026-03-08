import { Suspense } from "react";
import { ProductCard } from "../../_components/product-card";
import { Skeleton } from "../../_components/ui/skeleton";
import { Input } from "../../_components/ui/input";
import { Button } from "../../_components/ui/button";
import { getProducts } from "../../_services/catalog.service";

export const dynamic = "force-dynamic";

interface ProductsSearchParams {
  page?: string;
  category?: string;
  search?: string;
  sort?: "createdAt" | "updatedAt" | "title" | "price" | "rating" | "reviewCount";
  order?: "asc" | "desc";
  minPriceInCents?: string;
  maxPriceInCents?: string;
}

function parsePositiveInt(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

async function ProductGrid({
  searchParams,
}: {
  searchParams: ProductsSearchParams;
}) {
  const page = Number(searchParams.page ?? 1);
  const minPriceInCents = parsePositiveInt(searchParams.minPriceInCents);
  const maxPriceInCents = parsePositiveInt(searchParams.maxPriceInCents);

  const { data: products, total } = await getProducts({
    page,
    limit: 24,
    category: searchParams.category,
    search: searchParams.search,
    sort: searchParams.sort ?? "createdAt",
    order: searchParams.order ?? "desc",
    minPriceInCents,
    maxPriceInCents,
  }).catch(() => ({ data: [], total: 0, page: 1, limit: 24 }));

  if (products.length === 0) {
    return (
      <div className="col-span-full text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4 col-span-full">
        {total} product{total !== 1 ? "s" : ""}
      </p>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </>
  );
}

function ProductGridSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductsSearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          {params.category ?? "All Products"}
        </h1>
        {params.search && (
          <p className="text-muted-foreground">
            Results for &quot;{params.search}&quot;
          </p>
        )}
      </div>

      <form method="get" className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <Input
          name="search"
          placeholder="Search products"
          defaultValue={params.search ?? ""}
          className="md:col-span-2"
        />
        <Input
          name="category"
          placeholder="Category"
          defaultValue={params.category ?? ""}
        />
        <Input
          name="minPriceInCents"
          placeholder="Min price (cents)"
          defaultValue={params.minPriceInCents ?? ""}
          inputMode="numeric"
        />
        <Input
          name="maxPriceInCents"
          placeholder="Max price (cents)"
          defaultValue={params.maxPriceInCents ?? ""}
          inputMode="numeric"
        />
        <div className="flex gap-2 md:col-span-6">
          <select
            name="sort"
            defaultValue={params.sort ?? "createdAt"}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="createdAt">Newest</option>
            <option value="updatedAt">Recently Updated</option>
            <option value="price">Price</option>
            <option value="rating">Top Rated</option>
            <option value="reviewCount">Most Reviewed</option>
            <option value="title">Title A-Z</option>
          </select>
          <select
            name="order"
            defaultValue={params.order ?? "desc"}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <Button type="submit">Apply Filters</Button>
        </div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}
