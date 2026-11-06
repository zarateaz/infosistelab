import { getAdminProducts } from "../productos/actions";
import { InventoryTable } from "./InventoryTable";

export default async function AdminInventoryPage() {
  const products = await getAdminProducts();
  const lowStock = products.filter((p) => p.stock <= 3).length;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Inventario</h1>
      <p className="mt-1 text-sm text-fg-muted">
        {products.length} productos · {lowStock} con stock bajo (≤3).
      </p>

      <InventoryTable products={products} />
    </div>
  );
}
