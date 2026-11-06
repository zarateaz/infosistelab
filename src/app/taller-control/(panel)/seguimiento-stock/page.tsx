import { getStockMovements } from "./actions";
import { PackageSearch, TrendingUp, TrendingDown } from "lucide-react";

export default async function SeguimientoStockPage() {
  const movements = await getStockMovements();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Seguimiento de Stock</h1>
          <p className="mt-1 text-sm text-fg-muted">Historial de entradas y salidas de inventario, incluyendo ventas.</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Producto</th>
              <th className="px-5 py-3">Número/SKU</th>
              <th className="px-5 py-3">Movimiento</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const isPositive = m.quantity > 0;
              return (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-bg-raised/50">
                  <td className="px-5 py-3.5 text-fg-muted">
                    {new Date(m.date).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-fg">{m.product.name}</p>
                    <p className="text-xs text-fg-muted">{m.product.category}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-fg-muted">#{m.product.itemNumber}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {isPositive ? '+' : ''}{m.quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-full bg-border/50 px-2.5 py-1 text-xs font-semibold text-fg">
                      {m.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-fg-muted">{m.description || "-"}</td>
                </tr>
              );
            })}
            {movements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-fg-muted">
                  Todavía no hay movimientos de stock registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
