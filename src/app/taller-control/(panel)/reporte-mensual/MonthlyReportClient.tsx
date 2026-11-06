"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Printer,
  MessageCircle,
  Search,
  Package,
  DollarSign,
  TrendingUp,
  Star,
  Calendar,
  Layers,
  ListOrdered,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { StatCard } from "../StatCard";
import { InvoiceCell } from "../ventas/InvoiceCell";
import {
  getMonthlySalesReport,
  type MonthlyReportPayload,
} from "./actions";
import { generateMonthlySalesReportPDF } from "@/lib/pdfReportGenerator";
import { buildWhatsAppLink } from "@/lib/whatsappStockReport";

const MONTHS = [
  { value: 1, name: "Enero" },
  { value: 2, name: "Febrero" },
  { value: 3, name: "Marzo" },
  { value: 4, name: "Abril" },
  { value: 5, name: "Mayo" },
  { value: 6, name: "Junio" },
  { value: 7, name: "Julio" },
  { value: 8, name: "Agosto" },
  { value: 9, name: "Setiembre" },
  { value: 10, name: "Octubre" },
  { value: 11, name: "Noviembre" },
  { value: 12, name: "Diciembre" },
];

export function MonthlyReportClient({
  initialData,
}: {
  initialData: MonthlyReportPayload;
}) {
  const [data, setData] = useState<MonthlyReportPayload>(initialData);
  const [selectedYear, setSelectedYear] = useState(initialData.year);
  const [selectedMonth, setSelectedMonth] = useState(initialData.month);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"consolidated" | "detailed">("consolidated");
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    startTransition(async () => {
      const res = await getMonthlySalesReport(year, month);
      setData(res);
    });
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    handlePeriodChange(now.getFullYear(), now.getMonth() + 1);
  };

  const handlePreviousMonth = () => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    handlePeriodChange(prev.getFullYear(), prev.getMonth() + 1);
  };

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.products;
    return data.products.filter(
      (p) =>
        p.pName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [data.products, searchQuery]);

  // Filter sales list by search query
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.salesList;
    return data.salesList.filter(
      (s) =>
        s.pName.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q)
    );
  }, [data.salesList, searchQuery]);

  // Export PDF
  const handleDownloadPDF = () => {
    generateMonthlySalesReportPDF({
      year: data.year,
      month: data.month,
      monthName: data.monthName,
      totalUnits: data.totalUnits,
      totalRevenue: data.totalRevenue,
      totalCost: data.totalCost,
      totalProfit: data.totalProfit,
      salesCount: data.salesCount,
      topProduct: data.topProduct,
      products: data.products,
    });
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Send WhatsApp Monthly Summary
  const handleSendWhatsAppSummary = () => {
    const lines = [
      `📊 *INFOSISTEL - REPORTE DE VENTAS DEL MES* 📊`,
      `📅 *Período:* ${data.monthName} ${data.year}`,
      `-----------------------------------------`,
      `📦 *Unidades vendidas:* ${data.totalUnits} u.`,
      `💰 *Total recaudado:* S/. ${data.totalRevenue.toFixed(2)}`,
      `📈 *Ganancia neta:* S/. ${data.totalProfit.toFixed(2)}`,
      `🧾 *Transacciones:* ${data.salesCount}`,
    ];

    if (data.topProduct) {
      lines.push(
        `⭐ *Producto más vendido:* ${data.topProduct.pName} (${data.topProduct.totalQuantity} unidades)`
      );
    }

    if (data.products.length > 0) {
      lines.push(`\n🔝 *Top productos del mes:*`);
      data.products.slice(0, 5).forEach((p, idx) => {
        lines.push(
          `${idx + 1}. ${p.pName} (x${p.totalQuantity}) - S/. ${p.totalRevenue.toFixed(2)}`
        );
      });
    }

    lines.push(`-----------------------------------------`);
    lines.push(`_Reporte generado desde el panel de control de Infosistel._`);

    window.open(buildWhatsAppLink(lines.join("\n")), "_blank");
  };

  // Generate Year options (current year and 2 previous years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <Link href="/taller-control/ventas" className="hover:underline">
              Ventas
            </Link>
            <span>/</span>
            <span className="text-fg-muted">Reporte Mensual</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fg">
            Reporte Mensual de Productos Vendidos
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Control de cuentas, productos vendidos y balance del mes con exportación PDF.
          </p>
        </div>

        {/* Action Buttons: PDF, Print, WhatsApp */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-fg shadow-md shadow-accent/25 transition-all hover:opacity-90 active:scale-95"
            title="Descargar reporte en formato PDF de alta resolución"
          >
            <Download size={15} />
            <span>Descargar PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-alt px-3.5 py-2.5 text-xs font-semibold text-fg transition-colors hover:border-accent hover:text-accent"
            title="Imprimir reporte"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={handleSendWhatsAppSummary}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            title="Enviar balance resumido al WhatsApp de la empresa"
          >
            <MessageCircle size={15} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Period Selector Controls */}
      <div className="admin-glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">
              Período:
            </span>
          </div>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) =>
              handlePeriodChange(selectedYear, parseInt(e.target.value, 10))
            }
            disabled={isPending}
            className="rounded-xl border border-border bg-bg px-3 py-1.5 text-sm font-semibold text-fg outline-none focus:border-accent"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) =>
              handlePeriodChange(parseInt(e.target.value, 10), selectedMonth)
            }
            disabled={isPending}
            className="rounded-xl border border-border bg-bg px-3 py-1.5 text-sm font-semibold text-fg outline-none focus:border-accent"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Period Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCurrentMonth}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            Mes anterior
          </button>
        </div>
      </div>

      {/* New Month Blank Notice */}
      {data.products.length === 0 && (
        <div className="admin-glass flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-fg">
              El mes de {data.monthName} {data.year} inicia en blanco
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Todavía no se han registrado ventas en este mes. Puedes consultar el histórico de meses anteriores o descargar el reporte en blanco.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 self-start sm:self-auto"
          >
            <span>Ver mes anterior ({MONTHS[(data.month + 10) % 12]?.name})</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Unidades vendidas"
          value={`${data.totalUnits} u.`}
          sub={`${data.salesCount} venta(s) registradas`}
          tint="blue"
        />
        <StatCard
          icon={DollarSign}
          label="Ingresos totales"
          value={`S/. ${data.totalRevenue.toFixed(2)}`}
          sub="Total facturado en el mes"
          tint="cyan"
        />
        <StatCard
          icon={TrendingUp}
          label="Ganancia neta"
          value={`S/. ${data.totalProfit.toFixed(2)}`}
          sub={`Margen: ${
            data.totalRevenue > 0
              ? ((data.totalProfit / data.totalRevenue) * 100).toFixed(1)
              : 0
          }%`}
          tint="emerald"
        />
        <StatCard
          icon={Star}
          label="Producto estrella"
          value={data.topProduct ? `${data.topProduct.totalQuantity} u.` : "-"}
          sub={data.topProduct ? data.topProduct.pName : "Sin ventas en este mes"}
          tint="violet"
        />
      </div>

      {/* Search and Tab Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-alt p-1">
          <button
            type="button"
            onClick={() => setActiveTab("consolidated")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "consolidated"
                ? "bg-accent text-accent-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Layers size={14} />
            Consolidado por Producto ({data.products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("detailed")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "detailed"
                ? "bg-accent text-accent-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <ListOrdered size={14} />
            Historial de Ventas ({data.salesList.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            type="text"
            placeholder="Filtrar por producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-alt py-2 pl-9 pr-3 text-xs text-fg outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* TAB 1: Consolidated Table */}
      {activeTab === "consolidated" && (
        <div className="admin-glass overflow-x-auto rounded-[var(--radius-lg)]">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3 text-center">Unidades</th>
                <th className="px-5 py-3 text-right">P. Promedio</th>
                <th className="px-5 py-3 text-right">Total Ventas</th>
                <th className="px-5 py-3 text-right">Ganancia</th>
                <th className="px-5 py-3 text-right">% Ventas</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, idx) => (
                <tr
                  key={p.pName}
                  className="border-b border-border transition-colors hover:bg-fg/5 last:border-0"
                >
                  <td className="px-5 py-3.5 text-xs font-bold text-fg-muted">
                    {idx + 1}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-fg">{p.pName}</p>
                    <p className="text-[11px] text-fg-muted">
                      {p.salesCount} transacción(es)
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-fg-muted">
                    <span className="rounded-md bg-fg/5 px-2 py-1 font-semibold">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold text-fg">
                    <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-accent">
                      {p.totalQuantity} u.
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-fg">
                    S/. {p.averageUnitPrice.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-fg">
                    S/. {p.totalRevenue.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-500">
                    S/. {p.totalProfit.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-fg/10">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${Math.min(100, p.percentageOfTotal)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-fg-muted">
                        {p.percentageOfTotal.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-fg-muted">
                    No se encontraron productos vendidos en este período.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredProducts.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-bg-alt/60 font-bold text-fg">
                  <td className="px-5 py-3 text-xs" colSpan={3}>
                    TOTALES DEL MES ({data.monthName.toUpperCase()} {data.year})
                  </td>
                  <td className="px-5 py-3 text-center text-accent">
                    {data.totalUnits} u.
                  </td>
                  <td className="px-5 py-3 text-right">-</td>
                  <td className="px-5 py-3 text-right">
                    S/. {data.totalRevenue.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-emerald-500">
                    S/. {data.totalProfit.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* TAB 2: Detailed Sales List Table */}
      {activeTab === "detailed" && (
        <div className="admin-glass overflow-x-auto rounded-[var(--radius-lg)]">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
                <th className="px-5 py-3">Fecha y Hora</th>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Cantidad</th>
                <th className="px-5 py-3">Total Venta</th>
                <th className="px-5 py-3">Ganancia</th>
                <th className="px-5 py-3">Comprobante SUNAT</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border transition-colors hover:bg-fg/5 last:border-0"
                >
                  <td className="px-5 py-3.5 text-xs text-fg-muted">
                    {new Date(s.date).toLocaleString("es-PE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-fg">{s.pName}</p>
                    {s.category && (
                      <p className="text-[11px] text-fg-muted">{s.category}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-fg font-bold">x{s.quantity}</td>
                  <td className="px-5 py-3.5 font-bold text-fg">
                    S/. {s.price.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-emerald-500">
                    S/. {s.profit.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5">
                    <InvoiceCell invoice={s.invoice} />
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-fg-muted">
                    No hay transacciones registradas en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
