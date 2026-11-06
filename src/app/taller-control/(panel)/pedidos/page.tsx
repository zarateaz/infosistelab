import { Search } from "lucide-react";
import { getAdminOrders } from "./actions";
import { InvoiceCell } from "./InvoiceCell";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ telefono?: string }>;
}) {
  const { telefono } = await searchParams;
  const orders = await getAdminOrders(telefono);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Pedidos</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {orders.length} pedido{orders.length === 1 ? "" : "s"}
            {telefono ? ` para "${telefono}"` : ""}.
          </p>
        </div>

        <form className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            name="telefono"
            defaultValue={telefono}
            placeholder="Buscar por celular..."
            className="w-64 rounded-xl border border-border bg-bg-alt py-2.5 pl-10 pr-4 text-sm text-fg outline-none focus:border-accent"
          />
        </form>
      </div>

      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="admin-glass rounded-[var(--radius-lg)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-fg">{order.customerName}</p>
                <p className="text-sm text-fg-muted">{order.customerPhone}</p>
                <p className="mt-1 text-xs text-fg-muted">
                  {new Date(order.date).toLocaleString("es-PE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="text-lg font-bold text-accent">S/. {order.total.toFixed(2)}</p>
                <InvoiceCell invoice={order.invoice} />
              </div>
            </div>

            <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-fg-muted">
                  <span>
                    {item.name} <span className="text-fg">x{item.quantity}</span>
                  </span>
                  {item.unitPrice != null && (
                    <span>S/. {(item.unitPrice * item.quantity).toFixed(2)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="admin-glass rounded-[var(--radius-lg)] px-6 py-14 text-center text-fg-muted">
            {telefono ? "Ningún pedido coincide con ese número." : "Todavía no hay pedidos."}
          </div>
        )}
      </div>
    </div>
  );
}
