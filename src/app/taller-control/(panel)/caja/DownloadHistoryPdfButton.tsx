"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { generateCashboxReportPDF } from "@/lib/pdfReportGenerator";
import type { AdminTransaction } from "./actions";

export function DownloadHistoryPdfButton({
  transactions,
  label,
  monthKey,
  monthLabel,
}: {
  transactions: AdminTransaction[];
  label?: string;
  monthKey?: string;
  monthLabel?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    try {
      setIsDownloading(true);
      generateCashboxReportPDF({
        month: monthKey || "HISTORIAL_COMPLETO",
        monthLabel: monthLabel || "Historial Completo de Movimientos",
        responsible: "Administración",
        transactions,
      });
    } catch (err) {
      console.error("Error al generar PDF de movimientos:", err);
      alert("No se pudo generar el reporte en PDF. Intenta nuevamente.");
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={transactions.length === 0 || isDownloading}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
        transactions.length === 0
          ? "cursor-not-allowed border border-border bg-bg-alt text-fg-muted opacity-50"
          : "border border-border bg-bg text-fg shadow-sm hover:border-accent hover:text-accent"
      }`}
      title="Descargar estos movimientos en formato PDF"
    >
      {isDownloading ? (
        <Loader2 size={13} className="animate-spin text-inherit" />
      ) : (
        <Download size={13} />
      )}
      <span>{label ?? `Descargar PDF (${transactions.length})`}</span>
    </button>
  );
}
