import Link from "next/link";
import { DollarSign, TrendingUp, PieChart, FileText } from "lucide-react";
import { getSaleStats, getRecentSales, deleteSale } from "./actions";
import { DeleteSaleButton } from "./DeleteSaleButton";
import { InvoiceCell } from "./InvoiceCell";
import { StatCard, type StatTint } from "../StatCard";

const STAT_CARDS: { key: "day" | "week" | "month"; label: string; icon: typeof TrendingUp; tint: StatTint }[] = [
  { key: "day", label: "Descuentos de hoy", icon: TrendingUp, tint: "emerald" },
  { key: "week", label: "Semana actual", icon: PieChart, tint: "violet" },
  { key: "month", label: "Este mes", icon: DollarSign, tint: "cyan" },
];

export default async function AdminSalesPage() {
  const [stats, sales] = await Promise.all([getSaleStats(), getRecentSales()]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Registro de Descuentos</h1>
          <p className="mt-1 text-sm text-fg-muted">Historial de productos descontados por ventas web y en tienda física.</p>
        </div>
        <Link
          href="/taller-control/reporte-mensual"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-fg shadow-md shadow-accent/20 transition-all hover:opacity-90 active:scale-95 self-start sm:self-auto"
        >
          <FileText size={15} />
          <span>Ver Reporte Mensual y Exportar PDF</span>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map(({ key, label, icon, tint }) => {
          const bucket = stats[key];
          return (
            <StatCard
              key={key}
              icon={icon}
              label={label}
              value={`S/. ${bucket.total.toFixed(2)}`}
              sub={`Ganancia: S/. ${bucket.profit.toFixed(2)} · ${bucket.count} venta${bucket.count === 1 ? "" : "s"}`}
              tint={tint}
            />
          );
        })}
      </div>

      <div className="mt-8 overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
              <th className="px-5 py-3">Producto</th>
              <th className="px-5 py-3">Cantidad</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Ganancia</th>
              <th className="px-5 py-3">Origen</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Comprobante</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-fg">{s.pName}</p>
                  {s.category && <p className="text-xs text-fg-muted">{s.category}</p>}
                </td>
                <td className="px-5 py-3.5 text-fg">x{s.quantity}</td>
                <td className="px-5 py-3.5 text-fg">S/. {s.price.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-accent">S/. {s.profit.toFixed(2)}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${s.origin === 'WEB' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                    {s.origin === 'WEB' ? 'Página Web' : 'Tienda Física'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-fg-muted">
                  {new Date(s.date).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-5 py-3.5">
                  <InvoiceCell invoice={s.invoice} />
                </td>
                <td className="px-5 py-3.5">
                  <DeleteSaleButton
                    productName={s.pName}
                    action={async () => {
                      "use server";
                      await deleteSale(s.id);
                    }}
                  />
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-fg-muted">
                  Todavía no hay ventas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
