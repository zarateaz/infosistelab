"use client";

import { useState } from "react";
import {
  X,
  Download,
  MessageCircle,
  Printer,
  Edit2,
  Calendar,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  CreditCard,
  Truck,
  ExternalLink,
  ImageIcon,
  ZoomIn,
} from "lucide-react";
import type { QuotationRecord } from "./actions";
import { generateQuotationPDF } from "@/lib/quotationPdfGenerator";
import { formatQuotationDate } from "@/lib/quotationDates";
import { updateQuotationStatus, buildWhatsAppQuotationLink } from "./actions";

interface CotizacionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationRecord | null;
  onEdit: (quotation: QuotationRecord) => void;
  onStatusChange: (id: string, newStatus: any) => void;
}

export function CotizacionDetailModal({
  isOpen,
  onClose,
  quotation,
  onEdit,
  onStatusChange,
}: CotizacionDetailModalProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<string | null>(null);

  if (!isOpen || !quotation) return null;

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

  const handleSendWhatsApp = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.infosistel.com.pe";
    const link = await buildWhatsAppQuotationLink(quotation, origin);
    window.open(link, "_blank");
  };

  const handleStatusSelect = async (newStatus: any) => {
    try {
      setIsUpdatingStatus(true);
      await updateQuotationStatus(quotation.id, newStatus);
      onStatusChange(quotation.id, newStatus);
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const statusColors: Record<string, string> = {
    PENDIENTE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    ENVIADA: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    APROBADA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    RECHAZADA: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    FACTURADA: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="admin-glass relative my-8 w-full max-w-3xl rounded-3xl border border-border bg-bg p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-fg sm:text-2xl">
                {quotation.code}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  statusColors[quotation.status] || "bg-fg/10 text-fg-muted"
                }`}
              >
                {quotation.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">
              Emitida el {formatQuotationDate(quotation.issueDate)} · Validez de {quotation.validDays} días
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(quotation);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg-alt px-3 py-1.5 text-xs font-semibold text-fg hover:border-accent hover:text-accent"
            >
              <Edit2 size={13} />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-alt text-fg-muted transition-colors hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent/5 border border-accent/20 p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                Cambiar Estado:
              </span>
              <select
                value={quotation.status}
                onChange={(e) => handleStatusSelect(e.target.value)}
                disabled={isUpdatingStatus}
                className="admin-field rounded-xl px-2.5 py-1 text-xs font-bold text-fg"
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="ENVIADA">ENVIADA</option>
                <option value="APROBADA">APROBADA</option>
                <option value="RECHAZADA">RECHAZADA</option>
                <option value="FACTURADA">FACTURADA</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-fg shadow-sm shadow-accent/25 transition-all hover:opacity-90 active:scale-95"
              >
                <Download size={13} />
                <span>Descargar PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
              </button>

              <a
                href={`/cotizacion/${quotation.code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-accent hover:text-accent"
              >
                <ExternalLink size={13} />
                <span>Ver online</span>
              </a>
            </div>
          </div>

          {/* Client Info Grid */}
          <div className="rounded-2xl border border-border bg-bg-alt/40 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Información del Cliente
            </h4>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-fg-muted">Cliente:</span>{" "}
                <span className="font-bold text-fg">{quotation.clientName}</span>
              </div>
              <div>
                <span className="text-fg-muted">{quotation.clientDocType || "Doc"}:</span>{" "}
                <span className="font-semibold text-fg">{quotation.clientDocNum || "No especificado"}</span>
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
                <span className="text-fg-muted">Correo:</span>{" "}
                <span className="font-semibold text-fg">{quotation.clientEmail || "-"}</span>
              </div>
              <div>
                <span className="text-fg-muted">Dirección:</span>{" "}
                <span className="font-semibold text-fg">{quotation.clientAddress || "Huancayo"}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-bg">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-bg-alt/70 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                  <th className="px-3.5 py-2.5 text-center w-8">#</th>
                  <th className="px-3.5 py-2.5 text-center w-12">Cant.</th>
                  <th className="px-3.5 py-2.5">Descripción</th>
                  <th className="px-3.5 py-2.5 text-right w-24">P. Unit.</th>
                  <th className="px-3.5 py-2.5 text-right w-24">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {quotation.items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-fg/[0.02]">
                    <td className="px-3.5 py-2.5 text-center font-bold text-fg-muted">{idx + 1}</td>
                    <td className="px-3.5 py-2.5 text-center font-bold text-fg">{it.quantity}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-start gap-2.5">
                        {it.image && (
                          <img
                            src={it.image}
                            alt={it.description}
                            className="h-10 w-10 shrink-0 rounded-lg object-contain bg-white border border-border p-0.5 shadow-xs"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-fg whitespace-pre-line">{it.description}</p>
                          {(it.brand || it.model) && (
                            <p className="text-[10px] text-fg-muted">
                              {[it.brand, it.model].filter(Boolean).join(" - ")}
                            </p>
                          )}
                          {it.notes && <p className="text-[10px] text-accent/80 whitespace-pre-line mt-0.5">{it.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium text-fg">
                      {currSymbol} {it.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {currSymbol} {it.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col items-end">
            <div className="w-full max-w-xs space-y-1.5 rounded-2xl border border-border bg-bg-alt/50 p-4 text-xs">
              <div className="flex items-center justify-between text-fg-muted">
                <span>Subtotal:</span>
                <span className="font-semibold text-fg">
                  {currSymbol} {quotation.subtotal.toFixed(2)}
                </span>
              </div>
              {(quotation.discount || 0) > 0 && (
                <div className="flex items-center justify-between text-rose-600">
                  <span>Descuento:</span>
                  <span className="font-semibold">
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
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-bold text-fg">
                <span>TOTAL:</span>
                <span className="text-base text-accent">
                  {currSymbol} {quotation.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Commercial conditions */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-2xl border border-border bg-bg-alt/30 p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Condiciones Comerciales
              </span>
              <p className="text-fg-muted">
                • <strong className="text-fg">Entrega:</strong> {quotation.deliveryTime || "Inmediata"}
              </p>
              <p className="text-fg-muted">
                • <strong className="text-fg">Pago:</strong> {quotation.paymentMethod || "Contado / Transferencia"}
              </p>
              <p className="text-fg-muted">
                • <strong className="text-fg">Garantía:</strong> {quotation.warranty || "12 meses oficial"}
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

            <div className="rounded-2xl border border-border bg-bg-alt/30 p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Cuentas Bancarias para Depósito
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="rounded-lg bg-bg/70 p-2 border border-border/50 text-[11px]">
                  <p className="font-bold text-fg">Banco de la Nación (Cta. Corriente Soles):</p>
                  <p className="text-fg-muted font-mono">00-381-139530 · CCI: 018-381-000381139530-44</p>
                  <p className="text-[10px] text-fg-muted/80">Titular: INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL</p>
                </div>
                <div className="rounded-lg bg-bg/70 p-2 border border-border/50 text-[11px]">
                  <p className="font-bold text-fg">Interbank Soles (Cuenta Negocios):</p>
                  <p className="text-fg-muted font-mono">5003008920133 · CCI: 00350000300892013366</p>
                  <p className="text-[10px] text-fg-muted/80">Titular: INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL</p>
                </div>
                <div className="rounded-lg bg-bg/70 p-2 border border-border/50 text-[11px]">
                  <p className="font-bold text-fg">Interbank Dólares (Cuenta Negocios):</p>
                  <p className="text-fg-muted font-mono">5003008920140 · CCI: 00350000300892014061</p>
                  <p className="text-[10px] text-fg-muted/80">Titular: INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL</p>
                </div>
                <p className="text-xs font-semibold text-accent">
                  • Yape / Plin: 900 000 000 (Laboratorio INFOSISTEL / Infosistel)
                </p>
              </div>
            </div>
          </div>

          {/* Attached Photos / Anexo Fotográfico */}
          {parsedImages.length > 0 && (
            <div className="rounded-2xl border border-border bg-bg-alt/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <ImageIcon size={13} />
                  <span>Anexo Fotográfico / Referencias Visuales ({parsedImages.length})</span>
                </span>
                <span className="text-[11px] text-fg-muted">Incluidas en el PDF oficial</span>
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
                      alt={`Foto ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                      <span className="rounded-full bg-black/60 p-1.5 text-white">
                        <ZoomIn size={14} />
                      </span>
                    </div>
                    <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visítanos en Huancayo & Web */}
          <div className="rounded-2xl border border-border bg-bg-alt/40 p-3.5 text-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <MapPin size={12} />
              <span>Visítanos en Huancayo y en nuestra Web</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-fg-muted">
              <div>
                <p>• Av. Giráldez 274, Semisótano Stand S25</p>
                <p>• Av. Giráldez 274, 1er Nivel Stand B-10</p>
              </div>
              <div>
                <p>• Tel / WhatsApp: +51 900 000 000</p>
                <p>• Web oficial: <a href="https://www.infosistel.com.pe/" target="_blank" rel="noopener noreferrer" className="hover:underline text-brand-primary font-medium">https://www.infosistel.com.pe/</a> · Lun-Sáb 9am-7pm</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
