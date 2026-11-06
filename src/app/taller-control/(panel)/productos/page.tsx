import { getCategories } from "@/app/tienda/actions";
import { getAdminProducts, createProduct } from "./actions";
import { ProductsManager } from "./ProductsManager";

export const metadata = {
  title: "Inventario & Productos",
};

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([getAdminProducts(), getCategories()]);

  return (
    <ProductsManager
      products={products}
      categoryNames={categories.map((c) => c.name)}
      createProductAction={createProduct}
    />
  );
}
