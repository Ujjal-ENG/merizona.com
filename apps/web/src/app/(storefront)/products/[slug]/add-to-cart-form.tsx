"use client";

import { useState } from "react";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "../../../_components/ui/button";
import { Badge } from "../../../_components/ui/badge";
import { formatPrice } from "../../../_lib/utils";
import { useCart } from "../../../_hooks/use-cart";
import type { Product, ProductVariant } from "../../../_lib/types";

export function AddToCartForm({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCart((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({
      productId: product._id,
      variantSku: selectedVariant.sku,
      title: product.title,
      variantLabel: selectedVariant.label,
      priceInCents: selectedVariant.priceInCents,
      quantity,
      imageUrl: selectedVariant.images?.[0] ?? "",
      vendorId: product.vendorId,
      vendorName: product.vendorName ?? "",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">
        {formatPrice(selectedVariant.priceInCents)}
      </div>

      {/* Variant selector */}
      {product.variants.length > 1 && (
        <div>
          <p className="text-sm font-medium mb-2">
            {selectedVariant.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.sku}
                onClick={() => setSelectedVariant(variant)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  selectedVariant.sku === variant.sku
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-muted"
                }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Quantity</span>
        <div className="flex items-center border rounded-md">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 py-1.5 hover:bg-muted transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="px-4 py-1.5 text-sm font-medium min-w-[2.5rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="px-3 py-1.5 hover:bg-muted transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={handleAddToCart}
        disabled={added}
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        {added ? "Added to cart!" : "Add to Cart"}
      </Button>
    </div>
  );
}
