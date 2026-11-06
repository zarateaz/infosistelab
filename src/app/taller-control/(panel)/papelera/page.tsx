import { Trash2 } from "lucide-react";
import { getDeletedSales } from "../ventas/actions";
import { getDeletedTransactions } from "../caja/actions";
import { DeletedSaleRow } from "./DeletedSaleRow";
import { DeletedTransactionRow } from "./DeletedTransactionRow";

export default async function AdminTrashPage() {
  const [sales, transactions] = await Promise.all([getDeletedSales(), getDeletedTransactions()]);

  return (
    <div>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-fg">
        <Trash2 size={22} className="text-accent" /> Papelera
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        Restaura una venta o un movimiento de Caja para que vuelva a su lugar, con su fecha original intacta.
      </p>

      <div className="mt-8 space-y-8">
        <div>
          <h2 className="font-display text-lg font-bold text-fg">
            Ventas eliminadas <span className="text-sm font-normal text-fg-muted">· {sales.length}</span>
          </h2>
          <div className="mt-3 overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
                  <th className="px-5 py-3">Producto</th>
                  <th className="px-5 py-3">Cantidad</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Fecha de la venta</th>
                  <th className="px-5 py-3">Eliminada el</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <DeletedSaleRow key={s.id} sale={s} />
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-fg-muted">
                      No hay ventas eliminadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-fg">
            Movimientos de Caja eliminados <span className="text-sm font-normal text-fg-muted">· {transactions.length}</span>
          </h2>
          <div className="mt-3 overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3">Monto</th>
                  <th className="px-5 py-3">Fecha del movimiento</th>
                  <th className="px-5 py-3">Eliminado el</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <DeletedTransactionRow key={t.id} transaction={t} />
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-fg-muted">
                      No hay movimientos de Caja eliminados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
