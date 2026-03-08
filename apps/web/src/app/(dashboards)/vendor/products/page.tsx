import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { getVendorProducts } from "../../../_services/catalog.service";
import { Badge } from "../../../_components/ui/badge";
import { Button } from "../../../_components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../_components/ui/table";
import { formatDate, formatPrice } from "../../../_lib/utils";

export const dynamic = "force-dynamic";

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const { data: products, total } = await getVendorProducts({ page }).catch(
    () => ({ data: [], total: 0, page: 1, limit: 20 }),
  );

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    published: "default",
    draft: "secondary",
    archived: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm">{total} products</p>
        </div>
        <Button asChild>
          <Link href="/vendor/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKUs</TableHead>
              <TableHead>Price from</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  No products yet.{" "}
                  <Link href="/vendor/products/new" className="text-primary hover:underline">
                    Add your first product →
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium line-clamp-1">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.slug}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {product.variants.length}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatPrice(
                      Math.min(...product.variants.map((v) => v.priceInCents)),
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[product.status] ?? "outline"}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(product.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/vendor/products/${product._id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
