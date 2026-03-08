import { notFound } from "next/navigation";
import { getVendorProductById } from "../../../../../_services/catalog.service";
import { ProductEditForm } from "./product-edit-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  let product;
  try {
    product = await getVendorProductById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground text-sm">{product.title}</p>
      </div>
      <ProductEditForm product={product} />
    </div>
  );
}
