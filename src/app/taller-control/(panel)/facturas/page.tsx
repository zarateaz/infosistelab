import Link from "next/link";
import { ChevronLeft, ChevronRight, FileCheck2, FileX2, FileStack, Wallet } from "lucide-react";
import { getAdminInvoicesForMonth, listInvoiceMonths } from "./actions";
import { monthKey } from "./month";
import { InvoiceActions } from "./InvoiceActions";
import { NewInvoiceButton } from "./NewInvoiceButton";
import { MonthSelector } from "./MonthSelector";
import { StatCard, type StatTint } from "../StatCard";

function adjacentMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split("-").map(Number);
  const d = new Date(year, monthNum - 1 + delta, 1);
  return monthKey(d);
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : monthKey();

  const [invoices, invoiceMonths] = await Promise.all([getAdminInvoicesForMonth(month), listInvoiceMonths()]);
  // listInvoiceMonths() only knows about months with at least one invoice
  // (plus today's) — navigating via the </> arrows to an empty month would
  // otherwise select a <select> value with no matching <option>, and the
  // browser silently falls back to showing a DIFFERENT month than the one
  // actually on screen. Always guarantee the month being viewed is a
  // real option, even if it turns out empty.
  const availableMonths = invoiceMonths.includes(month) ? invoiceMonths : [...invoiceMonths, month].sort().reverse();

  const aceptadas = invoices.filter((i) => i.estado === "ACEPTADO").length;
  const conError = invoices.length - aceptadas;
  const totalFacturado = invoices.filter((i) => i.estado === "ACEPTADO").reduce((sum, i) => sum + i.total, 0);
  const boletas = invoices.filter((i) => i.tipo === "BOLETA").length;
  const facturas = invoices.filter((i) => i.tipo === "FACTURA").length;

  const STAT_CARDS: { label: string; value: string; icon: typeof FileStack; sub: string | null; tint: StatTint }[] = [
    {
      label: "Comprobantes emitidos",
      value: String(invoices.length),
      icon: FileStack,
      sub: `${boletas} boletas · ${facturas} facturas`,
      tint: "blue",
    },
    { label: "Aceptados por SUNAT", value: String(aceptadas), icon: FileCheck2, sub: null, tint: "emerald" },
    { label: "Con error", value: String(conError), icon: FileX2, sub: null, tint: conError > 0 ? "red" : "slate" },
    {
      label: "Total facturado",
      value: `S/. ${totalFacturado.toFixed(2)}`,
      icon: Wallet,
      sub: "Solo comprobantes aceptados",
      tint: "cyan",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Facturas</h1>
          <p className="mt-1 text-sm text-fg-muted">Registro mensual de comprobantes electrónicos emitidos.</p>
        </div>
        <NewInvoiceButton />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-fg">Mes: {month}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/taller-control/facturas?month=${adjacentMonth(month, -1)}`}
            aria-label="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronLeft size={15} />
          </Link>
          <MonthSelector month={month} availableMonths={availableMonths} />
          <Link
            href={`/taller-control/facturas?month=${adjacentMonth(month, 1)}`}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ label, value, icon, sub, tint }) => (
          <StatCard key={label} icon={icon} label={label} value={value} sub={sub} tint={tint} />
        ))}
      </div>

      <div className="mt-8 overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
              <th className="px-5 py-3">Comprobante</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Origen</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-fg">
                    {inv.tipo === "FACTURA" ? "Factura" : "Boleta"} {inv.serie}-{String(inv.numero).padStart(6, "0")}
                  </p>
                  {inv.estado !== "ACEPTADO" && inv.mensajeError && (
                    <p className="mt-0.5 max-w-xs truncate text-xs text-fg-muted" title={inv.mensajeError}>
                      {inv.mensajeError}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3.5 text-fg">{inv.clienteDenominacion}</td>
                <td className="px-5 py-3.5 text-fg-muted">{inv.origen}</td>
                <td className="px-5 py-3.5 text-fg">S/. {inv.total.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-fg-muted">
                  {new Date(inv.createdAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-5 py-3.5">
                  <InvoiceActions invoice={inv} />
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-fg-muted">
                  Ningún comprobante emitido en {month}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
