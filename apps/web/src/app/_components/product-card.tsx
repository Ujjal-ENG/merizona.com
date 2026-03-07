import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { formatPrice } from "../_lib/utils";
import type { Product } from "../_lib/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const firstVariant = product.variants[0];
  const minPrice = Math.min(...product.variants.map((v) => v.priceInCents));
  const maxPrice = Math.max(...product.variants.map((v) => v.priceInCents));
  const hasVariants = product.variants.length > 1;

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {firstVariant?.images?.[0] ? (
            <Image
              src={firstVariant.images[0]}
              alt={product.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
          {product.status === "draft" && (
            <Badge variant="secondary" className="absolute top-2 left-2">
              Draft
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-3">
        <Link href={`/products/${product.slug}`} className="hover:underline">
          <h3 className="font-medium text-sm line-clamp-2 leading-snug">
            {product.title}
          </h3>
        </Link>
        {product.vendorName && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {product.vendorSlug ? (
              <Link href={`/vendors/${product.vendorSlug}`} className="hover:underline">
                {product.vendorName}
              </Link>
            ) : (
              product.vendorName
            )}
          </p>
        )}
        {product.rating.count > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">
              {product.rating.avg.toFixed(1)} ({product.rating.count})
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-3 pt-0">
        <span className="font-semibold text-sm">
          {hasVariants && minPrice !== maxPrice
            ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
            : formatPrice(minPrice)}
        </span>
      </CardFooter>
    </Card>
  );
}
