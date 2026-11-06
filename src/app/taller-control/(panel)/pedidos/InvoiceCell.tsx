"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { retryOrderInvoice } from "./actions";

export function InvoiceCell({ invoice }: { invoice: { id: string; estado: string; pdfUrl: string | null } | null }) {
  const [isPending, startTransition] = useTransition();

  if (!invoice) {
    return <span className="text-xs font-medium text-fg-muted">Sin comprobante</span>;
  }

  if (invoice.estado === "ACEPTADO") {
    return invoice.pdfUrl ? (
      <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-accent underline">
        Ver comprobante
      </a>
    ) : (
      <span className="text-xs font-bold text-accent">Aceptado</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-red-600">{invoice.estado === "ERROR" ? "Error" : "Rechazado"}</span>
      <button
        onClick={() => startTransition(() => retryOrderInvoice(invoice.id))}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold text-fg transition-colors hover:bg-accent/10 disabled:opacity-50"
      >
        <RefreshCw size={11} className={isPending ? "animate-spin" : undefined} />
        Reintentar
      </button>
    </div>
  );
}
