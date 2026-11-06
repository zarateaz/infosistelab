"use client";

import { useState } from "react";
import Image from "next/image";
import type { AdminService } from "./actions";
import { formatSoles, formatFecha, pendingBalance, PAYMENT_METHOD_LABELS } from "./utils";
import { ServiceDetailModal } from "./ServiceDetailModal";
import { CollectPaymentModal } from "./PaymentModals";

export function PendingTab({ services, onEdit }: { services: AdminService[]; onEdit: (s: AdminService) => void }) {
  const [detailService, setDetailService] = useState<AdminService | null>(null);
  const [collectId, setCollectId] = useState<string | null>(null);

  const total = services.reduce((sum, s) => sum + pendingBalance(s), 0);
  const collectTarget = services.find((s) => s.id === collectId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-fg">Pendientes de cobro</h2>
          <p className="mt-1 text-sm text-fg-muted">Trabajos entregados o en curso que aún no han sido pagados por completo</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-fg-muted">Total pendiente</p>
          <p className="font-display text-xl font-extrabold text-red-600">{formatSoles(total)}</p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="mt-6 admin-glass flex flex-col items-center gap-2 rounded-[var(--radius-lg)] py-14 text-center text-fg-muted">
          <p className="font-semibold">No hay servicios pendientes de cobro. ¡Todo al día!</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const isPartial = s.paymentStatus === "PARCIAL";
            const saldo = pendingBalance(s);
            return (
              <div key={s.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-bg-alt">
                <button type="button" onClick={() => setDetailService(s)} className="relative aspect-video w-full bg-bg text-left">
                  {s.photos[0] && <Image src={s.photos[0].path} alt="" fill sizes="33vw" className="object-cover" />}
                  {isPartial && (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">Pago parcial</span>
                  )}
                </button>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <button type="button" onClick={() => setDetailService(s)} className="text-left">
                    <h3 className="font-semibold text-fg">{s.clientName}</h3>
                    <span className="text-xs text-fg-muted">{s.title} · {s.equipmentTypeIcon} {s.equipmentTypeName}</span>
                  </button>
                  <p className="text-xs text-fg-muted">{s.technicianName} · {formatFecha(s.serviceDate)}</p>
                  <p className="text-xs text-fg-muted">📞 {s.clientPhone}</p>
                  {isPartial && (
                    <div className="mt-1 rounded-lg bg-bg-raised/60 p-2 text-xs text-fg-muted">
                      <p>
                        Adelanto pagado ({s.advancePaymentMethod ? PAYMENT_METHOD_LABELS[s.advancePaymentMethod] : "—"}):{" "}
                        <strong className="text-fg">{formatSoles(s.advanceAmount ?? 0)}</strong>
                      </p>
                      <p>
                        Saldo pendiente: <strong className="text-fg">{formatSoles(saldo)}</strong>
                      </p>
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
                    <span className="font-bold text-red-600">{formatSoles(saldo)}</span>
                    <button
                      type="button"
                      onClick={() => setCollectId(s.id)}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg hover:opacity-90"
                    >
                      {isPartial ? "Cobrar saldo" : "Marcar como pagado"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailService && (
        <ServiceDetailModal
          service={detailService}
          onClose={() => setDetailService(null)}
          onEdit={() => { onEdit(detailService); setDetailService(null); }}
        />
      )}

      {collectTarget && (
        <CollectPaymentModal
          serviceId={collectTarget.id}
          title={collectTarget.paymentStatus === "PARCIAL" ? "Cobrar saldo pendiente" : "Marcar como pagado"}
          amountLabel={formatSoles(pendingBalance(collectTarget))}
          onClose={() => setCollectId(null)}
        />
      )}
    </div>
  );
}
