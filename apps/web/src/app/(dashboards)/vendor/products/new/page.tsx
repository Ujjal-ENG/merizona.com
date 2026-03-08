import { ProductCreateForm } from "./product-create-form";

export default function NewProductPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Create Product</h1>
        <p className="text-muted-foreground text-sm">
          Add product details, variants, and optional attributes.
        </p>
      </div>

      <ProductCreateForm />
    </div>
  );
}
