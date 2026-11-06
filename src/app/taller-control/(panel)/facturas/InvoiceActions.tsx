"use client";

import { useTransition } from "react";
import { RefreshCw, MessageCircle, FileText } from "lucide-react";
import { retryInvoice, type AdminInvoice } from "./actions";

/** Heurística simple para Perú: un celular capturado como 9 dígitos
 *  ("987654321") no trae el código de país que wa.me necesita. */
function toWhatsappNumber(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  return digits.length === 9 ? `51${digits}` : digits;
}

export function InvoiceActions({ invoice }: { invoice: AdminInvoice }) {
  const [isPending, startTransition] = useTransition();

  const shareByWhatsapp = () => {
    if (!invoice.telefono || !invoice.pdfUrl) return;
    const numero = String(invoice.numero).padStart(6, "0");
    const message = `Hola ${invoice.clienteDenominacion}, aquí tienes tu comprobante electrónico (${invoice.tipo === "FACTURA" ? "Factura" : "Boleta"} ${invoice.serie}-${numero}): ${invoice.pdfUrl}`;
    window.open(`https://wa.me/${toWhatsappNumber(invoice.telefono)}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {invoice.estado === "ACEPTADO" ? (
        <>
          {invoice.pdfUrl && (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold text-fg transition-colors hover:bg-accent/10"
            >
              <FileText size={11} />
              PDF
            </a>
          )}
          <button
            onClick={shareByWhatsapp}
            disabled={!invoice.telefono || !invoice.pdfUrl}
            title={invoice.telefono ? undefined : "No hay un celular guardado para este comprobante"}
            className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold text-fg transition-colors hover:bg-accent/10 disabled:opacity-40"
          >
            <MessageCircle size={11} />
            WhatsApp
          </button>
        </>
      ) : (
        <>
          <span className="text-xs font-bold text-red-600">{invoice.estado === "ERROR" ? "Error" : "Rechazado"}</span>
          <button
            onClick={() => startTransition(() => retryInvoice(invoice.id))}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold text-fg transition-colors hover:bg-accent/10 disabled:opacity-50"
          >
            <RefreshCw size={11} className={isPending ? "animate-spin" : undefined} />
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}
