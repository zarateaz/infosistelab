import { notFound } from "next/navigation";
import { getCategories } from "@/app/tienda/actions";
import { getAdminProduct, updateProduct } from "../actions";
import { ProductForm } from "../ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProduct(id), getCategories()]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Editar producto</h1>
      <div className="mt-8">
        <ProductForm
          product={product}
          categoryNames={categories.map((c) => c.name)}
          action={updateProduct.bind(null, id)}
        />
      </div>
    </div>
  );
}
