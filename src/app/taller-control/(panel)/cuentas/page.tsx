import { getReceivables, getPayables } from "./actions";
import { CuentasTabs } from "./CuentasTabs";
import { SummaryCards } from "./SummaryCards";
import { AccountsChart } from "./AccountsChart";
import { AddAccountForm } from "./AddAccountForm";
import { AccountRow } from "./AccountRow";

export default async function CuentasPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "pagar" ? "pagar" : "cobrar";

  const [receivables, payables] = await Promise.all([getReceivables(), getPayables()]);
  const rows = tab === "cobrar" ? receivables : payables;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Cuentas por Cobrar y Pagar</h1>
      <p className="mt-1 text-sm text-fg-muted">Seguimiento de deudas de clientes y obligaciones con proveedores.</p>

      <div className="mt-6">
        <SummaryCards receivables={receivables} payables={payables} />
      </div>

      <div className="mt-8 admin-glass rounded-[var(--radius-lg)] p-6">
        <h2 className="font-display text-lg font-bold text-fg">Cobrar vs. Pagar</h2>
        <div className="mt-4">
          <AccountsChart receivables={receivables} payables={payables} />
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <CuentasTabs tab={tab} />
      </div>

      <div className="mt-6">
        <AddAccountForm kind={tab} />
      </div>

      <div className="mt-8 overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
              <th className="px-4 py-3">Emisión</th>
              <th className="px-4 py-3">{tab === "cobrar" ? "Cliente" : "Proveedor"}</th>
              <th className="px-4 py-3">Doc. / Concepto</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Medio</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AccountRow key={row.id} row={row} kind={tab} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-fg-muted">
                  Todavía no hay cuentas {tab === "cobrar" ? "por cobrar" : "por pagar"} registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
