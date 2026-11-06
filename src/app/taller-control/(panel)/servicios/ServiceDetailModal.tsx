"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { deleteService, type AdminService } from "./actions";
import { PAYMENT_METHOD_LABELS, formatSoles, formatFecha, pendingBalance } from "./utils";
import { ConfirmDialog } from "../ConfirmDialog";
import { PhotoLightbox } from "./PhotoLightbox";
import { PaymentCell, StageCell } from "./ServiceCells";

export function ServiceDetailModal({ service, onClose, onEdit }: { service: AdminService; onClose: () => void; onEdit: () => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPartial = service.paymentStatus === "PARCIAL";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-bg-alt p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-fg">{service.clientName}</h2>
            <p className="text-sm text-fg-muted">{service.title}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StageCell service={service} />
            {!isPartial && <PaymentCell service={service} />}
            <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-bg">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem label="Teléfono" value={service.clientPhone} />
          <DetailItem label="Técnico responsable" value={service.technicianName} />
          <DetailItem label="Tipo de equipo" value={`${service.equipmentTypeIcon} ${service.equipmentTypeName}`} />
          {service.equipmentBrand && <DetailItem label="Marca" value={service.equipmentBrand} />}
          {service.equipmentModel && <DetailItem label="Modelo" value={service.equipmentModel} />}
          <DetailItem label="Fecha de recepción" value={formatFecha(service.serviceDate)} />
          <DetailItem label="Fecha de entrega" value={service.deliveryDate ? formatFecha(service.deliveryDate) : "Aún no entregado"} />
          <DetailItem label="Monto total" value={formatSoles(service.amount)} />
          {isPartial ? (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Pago parcial</p>
              <p className="mt-1 text-sm text-fg">
                Adelanto de <strong>{formatSoles(service.advanceAmount ?? 0)}</strong> vía{" "}
                {service.advancePaymentMethod ? PAYMENT_METHOD_LABELS[service.advancePaymentMethod] : "—"}.{" "}
                {service.balancePaymentMethod ? (
                  <>Saldo pagado vía {PAYMENT_METHOD_LABELS[service.balancePaymentMethod]}.</>
                ) : (
                  <>
                    Saldo pendiente: <strong>{formatSoles(pendingBalance(service))}</strong>.
                  </>
                )}
              </p>
            </div>
          ) : (
            <DetailItem label="Forma de pago" value={PAYMENT_METHOD_LABELS[service.paymentMethod]} />
          )}
          {service.diagnosis && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Diagnóstico (Falla encontrada)</p>
              <div className="mt-1 rounded-lg border-l-4 border-orange-600 bg-surface-base px-3 py-2">
                <p className="whitespace-pre-wrap text-sm text-fg">{service.diagnosis}</p>
              </div>
            </div>
          )}
          {service.solution && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Solución</p>
              <div className="mt-1 rounded-lg border-l-4 border-emerald-600 bg-surface-base px-3 py-2">
                <p className="whitespace-pre-wrap text-sm text-fg">{service.solution}</p>
              </div>
            </div>
          )}
          {service.description && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Descripción adicional</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{service.description}</p>
            </div>
          )}
        </div>

        {service.photos.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {service.photos.map((p, i) => (
              <button key={p.id} type="button" onClick={() => setLightboxIndex(i)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-bg">
                <Image src={p.path} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-xs text-fg-muted">Este servicio no tiene fotografías de evidencia.</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button
            onClick={() => setConfirmingDelete(true)}
            className="rounded-lg border-2 border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
          >
            Eliminar
          </button>
          <button onClick={onEdit} className="rounded-lg border-2 border-border-strong px-4 py-2 text-xs font-bold text-fg-muted transition-colors hover:text-fg">
            Editar
          </button>
          <button onClick={onClose} className="ml-auto rounded-lg bg-accent px-5 py-2 text-xs font-bold text-accent-fg hover:opacity-90">
            Cerrar
          </button>
        </div>
      </div>

      {lightboxIndex !== null && <PhotoLightbox photos={service.photos} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar servicio"
          message={`Se eliminará el registro de "${service.title}" para ${service.clientName}. Esta acción no se puede deshacer.`}
          danger
          pending={isPending}
          onConfirm={() => startTransition(async () => { await deleteService(service.id); setConfirmingDelete(false); onClose(); })}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>,
    document.body
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}
