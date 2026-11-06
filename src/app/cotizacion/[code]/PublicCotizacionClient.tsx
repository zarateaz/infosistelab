"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  MessageCircle,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  ImageIcon,
  ZoomIn,
  X,
} from "lucide-react";
import type { QuotationRecord } from "@/app/taller-control/(panel)/cotizaciones/actions";
import { generateQuotationPDF } from "@/lib/quotationPdfGenerator";
import {
  formatQuotationDate,
  COMPANY_RUC,
  COMPANY_BANK_ACCOUNTS,
  COMPANY_YAPE_PLIN,
  COMPANY_EMAIL,
} from "@/lib/quotationDates";

export function PublicCotizacionClient({ quotation }: { quotation: QuotationRecord }) {
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<string | null>(null);

  let parsedImages: string[] = [];
  if (quotation.images) {
    try {
      const p = JSON.parse(quotation.images);
      if (Array.isArray(p)) parsedImages = p;
    } catch {
      parsedImages = [];
    }
  }

  const currSymbol = quotation.currency === "USD" ? "$" : "S/.";

  const handleDownloadPDF = () => {
    generateQuotationPDF({
      code: quotation.code,
      clientName: quotation.clientName,
      clientDocType: quotation.clientDocType,
      clientDocNum: quotation.clientDocNum,
      clientPhone: quotation.clientPhone,
      clientEmail: quotation.clientEmail,
      clientAddress: quotation.clientAddress,
      attentionTo: quotation.attentionTo,
      issueDate: quotation.issueDate,
      validDays: quotation.validDays,
      currency: quotation.currency,
      includeIgv: quotation.includeIgv,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      igv: quotation.igv,
      total: quotation.total,
      deliveryTime: quotation.deliveryTime,
      paymentMethod: quotation.paymentMethod,
      warranty: quotation.warranty,
      notes: quotation.notes,
      items: quotation.items,
      images: parsedImages,
    });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola Infosistel, he revisado la cotización ${quotation.code} por ${currSymbol} ${quotation.total.toFixed(2)} a nombre de ${quotation.clientName} y deseo confirmar el pedido. ¿Cuáles son los siguientes pasos?`
    );
    window.open(`https://wa.me/51900000000?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Top Navbar */}
      <header className="border-b border-border bg-bg-alt/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/infosistel-logo-v3.png"
              alt="Infosistel"
              width={1366}
              height={166}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-fg shadow-sm shadow-accent/25 transition-all hover:opacity-90 active:scale-95"
            >
              <Download size={14} />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">Confirmar por WhatsApp</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-accent"
          >
            <ChevronLeft size={14} />
            <span>Volver a Infosistel</span>
          </Link>
        </div>

        {/* Document Card */}
        <div className="admin-glass rounded-3xl border border-border p-6 shadow-xl sm:p-10">
          {/* Header row */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b border-border pb-6">
            <div>
              <Image
                src="/brand/infosistel-logo-v3.png"
                alt="Infosistel"
                width={1366}
                height={166}
                priority
                className="h-9 w-auto object-contain"
              />
              <p className="mt-2 text-xs font-bold text-accent tracking-wide">
                INFORMÁTICA · SISTEMAS · TELECOMUNICACIONES
              </p>
              <p className="text-xs text-fg-muted mt-1">
                RUC: {COMPANY_RUC} · Huancayo, Junín · WhatsApp: (+51) 900 000 000
              </p>
              <div className="mt-2.5 inline-flex flex-wrap items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3.5 py-1 text-xs font-semibold text-accent">
                <span>🌐 ¡Visítanos en nuestra web:</span>
                <a
                  href="https://www.infosistel.com.pe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80 font-bold"
                >
                  https://www.infosistel.com.pe/
                </a>
                <span>! Cotizaciones y compras online 24/7</span>
              </div>
            </div>

            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Propuesta Comercial
              </span>
              <h2 className="font-display text-xl font-bold text-fg sm:text-2xl">
                {quotation.code}
              </h2>
              <p className="text-xs text-fg-muted mt-1">
                Fecha: {formatQuotationDate(quotation.issueDate)}
              </p>
              <p className="text-xs font-semibold text-accent">
                Válido por {quotation.validDays} días calendario
              </p>
            </div>
          </div>

          {/* Customer info */}
          <div className="mt-6 rounded-2xl bg-bg-alt/50 border border-border p-4 sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent mb-3">
              Datos del Cliente
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-fg-muted">Cliente:</span>{" "}
                <span className="font-bold text-fg">{quotation.clientName}</span>
              </div>
              <div>
                <span className="text-fg-muted">{quotation.clientDocType || "Documento"}:</span>{" "}
                <span className="font-semibold text-fg">{quotation.clientDocNum || "Sin documento"}</span>
              </div>
              <div>
                <span className="text-fg-muted">Atención a:</span>{" "}
                <span className="font-semibold text-fg">{quotation.attentionTo || quotation.clientName}</span>
              </div>
              <div>
                <span className="text-fg-muted">Teléfono:</span>{" "}
                <span className="font-semibold text-fg">{quotation.clientPhone || "-"}</span>
              </div>
              <div>
                <span className="text-fg-muted">Dirección:</span>{" "}
                <span className="font-semibold text-fg">{quotation.clientAddress || "Huancayo"}</span>
              </div>
              <div>
                <span className="text-fg-muted">Correo:</span>{" "}
                <span className="font-semibold text-fg">{quotation.clientEmail || "-"}</span>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-bg">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-bg-alt text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                  <th className="px-4 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3 text-center w-14">Cant.</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-right w-28">P. Unitario</th>
                  <th className="px-4 py-3 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {quotation.items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="px-4 py-3 text-center font-bold text-fg-muted">{idx + 1}</td>
                    <td className="px-4 py-3 text-center font-bold text-fg">{it.quantity}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-fg text-sm whitespace-pre-line">{it.description}</p>
                      {(it.brand || it.model) && (
                        <p className="text-[11px] text-fg-muted">
                          {[it.brand, it.model].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {it.notes && <p className="text-[11px] text-accent/80 mt-0.5 whitespace-pre-line">{it.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-fg">
                      {currSymbol} {it.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {currSymbol} {it.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex flex-col items-end">
            <div className="w-full max-w-sm space-y-2 rounded-2xl border border-border bg-bg-alt/60 p-5 text-xs">
              <div className="flex items-center justify-between text-fg-muted">
                <span>Subtotal:</span>
                <span className="font-semibold text-fg">
                  {currSymbol} {quotation.subtotal.toFixed(2)}
                </span>
              </div>
              {(quotation.discount || 0) > 0 && (
                <div className="flex items-center justify-between text-rose-600 font-semibold">
                  <span>Descuento aplicado:</span>
                  <span>
                    -{currSymbol} {quotation.discount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-fg-muted">
                <span>{quotation.includeIgv ? "I.G.V. (18%):" : "I.G.V. (Exonerado):"}</span>
                <span className="font-semibold text-fg">
                  {currSymbol} {quotation.igv.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-fg">
                <span>TOTAL GENERAL:</span>
                <span className="text-lg text-accent">
                  {currSymbol} {quotation.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Accounts */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-2xl border border-border bg-bg-alt/40 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-accent font-bold uppercase tracking-wider text-[11px]">
                <ShieldCheck size={14} />
                <span>Condiciones de la Oferta</span>
              </div>
              <p className="text-fg-muted">
                • <strong className="text-fg">Tiempo de Entrega:</strong>{" "}
                {quotation.deliveryTime || "Inmediata sujeto a stock"}
              </p>
              <p className="text-fg-muted">
                • <strong className="text-fg">Forma de Pago:</strong>{" "}
                {quotation.paymentMethod || "Contado contra entrega / Transferencia"}
              </p>
              <p className="text-fg-muted">
                • <strong className="text-fg">Garantía:</strong>{" "}
                {quotation.warranty || "12 meses de garantía oficial Infosistel"}
              </p>
              {quotation.notes && (
                <div className="pt-1 border-t border-border/50">
                  <p className="text-fg-muted">
                    • <strong className="text-fg">Observaciones:</strong>
                  </p>
                  <p className="whitespace-pre-line text-fg/90 pl-3 pt-0.5">{quotation.notes}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-bg-alt/40 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-accent font-bold uppercase tracking-wider text-[11px]">
                <Building2 size={14} />
                <span>Depósitos a Cuentas Bancarias</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="rounded-lg bg-bg/70 p-2.5 border border-border/60">
                  <p className="font-bold text-fg">Banco de la Nación (Cta. Corriente Soles)</p>
                  <p className="text-fg-muted font-mono text-[11px]">N° Cta: <strong className="text-fg font-semibold">00-381-139530</strong></p>
                  <p className="text-fg-muted font-mono text-[11px]">CCI: 018-381-000381139530-44</p>
                  <p className="text-[10px] text-fg-muted/80">Titular: INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL</p>
                </div>
                <div className="rounded-lg bg-bg/70 p-2.5 border border-border/60">
                  <p className="font-bold text-fg">Interbank Soles (Cuenta Negocios)</p>
                  <p className="text-fg-muted font-mono text-[11px]">N° Cta: <strong className="text-fg font-semibold">5003008920133</strong></p>
                  <p className="text-fg-muted font-mono text-[11px]">CCI: 00350000300892013366</p>
                  <p className="text-[10px] text-fg-muted/80">Titular: INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL</p>
                </div>
                <div className="rounded-lg bg-bg/70 p-2.5 border border-border/60">
                  <p className="font-bold text-fg">Interbank Dólares (Cuenta Negocios)</p>
                  <p className="text-fg-muted font-mono text-[11px]">N° Cta: <strong className="text-fg font-semibold">5003008920140</strong></p>
                  <p className="text-fg-muted font-mono text-[11px]">CCI: 00350000300892014061</p>
                  <p className="text-[10px] text-fg-muted/80">Titular: INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL</p>
                </div>
                <p className="text-xs font-semibold text-accent pt-0.5">
                  • Yape / Plin: 900 000 000 (Laboratorio INFOSISTEL / Infosistel)
                </p>
              </div>
            </div>
          </div>

          {/* Attached Photos / Anexo Fotográfico */}
          {parsedImages.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-bg-alt/40 p-5 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold uppercase tracking-wider text-accent text-[11px] flex items-center gap-1.5">
                  <ImageIcon size={14} />
                  <span>Referencias Visuales y Fotos Adjuntas ({parsedImages.length})</span>
                </h4>
                <span className="text-[11px] text-fg-muted font-medium">Click en una imagen para ampliar</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {parsedImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPhotoZoom(imgUrl)}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-border bg-bg transition-all hover:scale-[1.03] hover:border-accent hover:shadow-lg"
                  >
                    <img
                      src={imgUrl}
                      alt={`Foto adjunta ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                      <span className="rounded-full bg-black/60 p-1.5 text-white">
                        <ZoomIn size={14} />
                      </span>
                    </div>
                    <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      Foto #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visítanos en Huancayo */}
          <div className="mt-4 rounded-2xl border border-border bg-bg-alt/40 p-5 text-xs">
            <h4 className="font-display font-bold uppercase tracking-wider text-accent text-[11px] mb-3">
              Visítanos en Huancayo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-fg font-semibold">
                  <MapPin size={13} className="text-accent" />
                  <span>Dirección / Tiendas:</span>
                </div>
                <p className="text-fg-muted pl-4.5">• Av. Giráldez 274, Semisótano Stand S25, Huancayo</p>
                <p className="text-fg-muted pl-4.5">• Av. Giráldez 274, 1er Nivel Stand B-10, Huancayo</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-fg">
                  <Phone size={13} className="text-emerald-500" />
                  <span className="font-semibold">Teléfono / WhatsApp:</span>
                  <a href="https://wa.me/51900000000" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    +51 900 000 000
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-fg">
                  <Mail size={13} className="text-accent" />
                  <span className="font-semibold">Correo:</span>
                  <a href={`mailto:${COMPANY_EMAIL}`} className="text-accent hover:underline">
                    {COMPANY_EMAIL}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-fg">
                  <Clock size={13} className="text-fg-muted" />
                  <span className="font-semibold">Horario:</span>
                  <span className="text-fg-muted">Lun. a sáb., 9:00 am – 7:00 pm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Call to Action */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-accent/10 border border-accent/30 p-6 text-center">
            <div>
              <p className="font-display text-base font-bold text-fg">
                ¿Deseas confirmar este pedido o necesitas algún cambio?
              </p>
              <p className="text-xs text-fg-muted mt-0.5">
                Comunícate directamente con nuestro equipo de ventas para coordinar la entrega o facturación.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-accent-fg shadow-md shadow-accent/25 transition-all hover:opacity-90 active:scale-95"
              >
                <Download size={15} />
                <span>Descargar Cotización (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-95"
              >
                <MessageCircle size={15} />
                <span>Aceptar y Pedir por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox Zoom Modal */}
      {selectedPhotoZoom && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedPhotoZoom(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border border-white/20 bg-black/50 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhotoZoom(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={selectedPhotoZoom}
              alt="Vista ampliada"
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
