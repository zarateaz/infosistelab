"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Banknote,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { getCashboxTransactionsForMonth, type AdminTransaction, type CashboxMonthSummary } from "./actions";
import { generateCashboxReportPDF } from "@/lib/pdfReportGenerator";
import { monthKeyUTC } from "./month";

interface MonthlyReportsArchiveProps {
  monthsSummary: CashboxMonthSummary[];
  allTransactions?: AdminTransaction[];
  currentSelectedMonth: string;
}

export function MonthlyReportsArchive({
  monthsSummary,
  allTransactions,
  currentSelectedMonth,
}: MonthlyReportsArchiveProps) {
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);

  // Filter months to show: closed months or months that have transactions
  const pastMonths = monthsSummary.filter((m) => !m.isCurrent || m.count > 0);

  const handleDownload = async (m: CashboxMonthSummary) => {
    try {
      setDownloadingMonth(m.month);
      const txs =
        allTransactions && allTransactions.length > 0
          ? allTransactions.filter((t) => monthKeyUTC(t.date) === m.month)
          : await getCashboxTransactionsForMonth(m.month);

      generateCashboxReportPDF({
        month: m.month,
        monthLabel: m.label,
        responsible: m.responsible || undefined,
        transactions: txs,
      });
    } catch (err) {
      console.error("Error al descargar reporte mensual:", err);
      alert("Ocurrió un inconveniente al generar el PDF. Por favor intenta nuevamente.");
    } finally {
      setTimeout(() => {
        setDownloadingMonth(null);
      }, 800);
    }
  };

  return (
    <div className="admin-glass rounded-[var(--radius-lg)] p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <FileText size={17} />
            </div>
            <h2 className="font-display text-lg font-bold text-fg">
              Archivo de Reportes Mensuales (Descarga en PDF)
            </h2>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            Cada mes que concluye se archiva aquí con su balance oficial. Puedes descargar el PDF estructurado de cualquier mes en un clic.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {pastMonths.map((m, idx) => {
          const isSelected = m.month === currentSelectedMonth;
          const isLatestClosed = !m.isCurrent && idx <= 1 && m.count > 0;
          const isDownloading = downloadingMonth === m.month;

          return (
            <div
              key={m.month}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                isSelected
                  ? "border-accent bg-accent/[0.04] shadow-sm"
                  : isLatestClosed
                  ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                  : "border-border bg-bg/40"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold text-fg">
                      {m.label}
                    </span>
                    {m.isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        <Clock size={11} />
                        En curso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} />
                        Cerrado
                      </span>
                    )}
                    {isLatestClosed && (
                      <span className="hidden sm:inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        ⭐ Último mes cerrado
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {m.count > 0
                      ? `${m.count} movimiento(s) registrados · Resp: ${m.responsible || "Administración"}`
                      : "Sin movimientos en este período"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                    Balance Neto
                  </span>
                  <p
                    className={`text-sm font-bold ${
                      m.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                    }`}
                  >
                    S/. {m.balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Quick metrics bar */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-bg-alt/70 p-2.5 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-1.5">
                  <ArrowDownRight size={13} className="text-emerald-500" />
                  <span className="text-fg-muted">Ingresos:</span>
                  <span className="font-semibold text-fg">S/. {m.totalIncome.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight size={13} className="text-rose-500" />
                  <span className="text-fg-muted">Egresos:</span>
                  <span className="font-semibold text-fg">S/. {m.totalExpense.toFixed(2)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                <Link
                  href={`/taller-control/caja?month=${m.month}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  <Eye size={13} />
                  <span>Ver detalle del mes</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleDownload(m)}
                  disabled={m.count === 0 || isDownloading}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    m.count === 0
                      ? "cursor-not-allowed bg-fg/5 text-fg-muted opacity-60"
                      : isLatestClosed
                      ? "bg-accent text-accent-fg shadow-sm shadow-accent/25 hover:opacity-90"
                      : "border border-border bg-bg text-fg hover:border-accent hover:text-accent"
                  }`}
                  title={
                    m.count === 0
                      ? "No hay movimientos para generar reporte"
                      : `Descargar reporte mensual en PDF de ${m.label}`
                  }
                >
                  {isDownloading ? (
                    <Loader2 size={13} className="animate-spin text-inherit" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>
                    {isDownloading
                      ? "Generando..."
                      : `Descargar PDF (${m.count} movs.)`}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
