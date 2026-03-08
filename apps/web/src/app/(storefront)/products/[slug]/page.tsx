import { notFound } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { Separator } from "../../../_components/ui/separator";
import { Badge } from "../../../_components/ui/badge";
import { getProductBySlug } from "../../../_services/catalog.service";
import { AddToCartForm } from "./add-to-cart-form";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return { title: product.title, description: product.description.slice(0, 160) };
  } catch {
    return { title: "Product not found" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          {product.variants[0]?.images?.[0] ? (
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.variants[0].images[0]}
                alt={product.title}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          {/* Thumbnail strip */}
          {product.variants[0]?.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.variants[0].images.map((img, i) => (
                <div
                  key={i}
                  className="relative w-16 h-16 shrink-0 rounded overflow-hidden border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="object-cover w-full h-full" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            {product.category.length > 0 && (
              <div className="flex gap-1 mb-2">
                {product.category.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
            <h1 className="text-2xl font-bold">{product.title}</h1>
            {product.vendorName && (
              <p className="text-sm text-muted-foreground mt-1">
                by{" "}
                {product.vendorSlug ? (
                  <Link href={`/vendors/${product.vendorSlug}`} className="hover:underline">
                    {product.vendorName}
                  </Link>
                ) : (
                  product.vendorName
                )}
              </p>
            )}
          </div>

          {product.rating.count > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(product.rating.avg)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating.avg.toFixed(1)} ({product.rating.count} reviews)
              </span>
            </div>
          )}

          <Separator />

          {/* Variant selector + add to cart (client component) */}
          <AddToCartForm product={product} />

          <Separator />

          <div>
            <h2 className="font-semibold mb-2">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          {Object.keys(product.attributes).length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Details</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <>
                    <dt key={`k-${key}`} className="text-muted-foreground capitalize">
                      {key}
                    </dt>
                    <dd key={`v-${key}`}>{value}</dd>
                  </>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
