import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../_components/ui/button";
import { ProductCard } from "../_components/product-card";
import { getProducts } from "../_services/catalog.service";

export const revalidate = 60;

export default async function HomePage() {
  const { data: featuredProducts } = await getProducts({ limit: 8 }).catch(
    () => ({ data: [], total: 0, page: 1, limit: 8 }),
  );

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 to-primary/5 py-20">
        <div className="container text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Discover Independent Vendors
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Shop thousands of unique products from independent vendors — all in
            one place.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/products">
                Shop Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">Become a Vendor</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="container py-8">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[
            "Electronics",
            "Fashion",
            "Home & Garden",
            "Sports",
            "Books",
            "Art & Crafts",
            "Food",
            "Jewelry",
          ].map((cat) => (
            <Link
              key={cat}
              href={`/products?category=${encodeURIComponent(cat)}`}
              className="shrink-0 rounded-full border px-4 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Featured Products</h2>
          <Button variant="ghost" asChild>
            <Link href="/products">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No products yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
