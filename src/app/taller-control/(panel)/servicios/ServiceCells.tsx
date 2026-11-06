"use client";

import { useState, useTransition } from "react";
import { changePaymentMethod, changeEquipmentStage, type AdminService, type EquipmentStage } from "./actions";
import {
  PAYMENT_METHODS,
  EQUIPMENT_STAGES,
  PAYMENT_METHOD_LABELS,
  EQUIPMENT_STAGE_LABELS,
  formatSoles,
  formatFecha,
  pendingBalance,
} from "./utils";
import { PartialPaymentModal, CollectPaymentModal, DeliveryModal } from "./PaymentModals";

/** Kept in their own file (not colocated in ServicesTab.tsx) because
 *  ServiceDetailModal also renders them — putting them in ServicesTab.tsx,
 *  which itself renders ServiceDetailModal, would make the two files
 *  import each other. */

export function PaymentCell({ service }: { service: AdminService }) {
  const [isPending, startTransition] = useTransition();
  const [showPartial, setShowPartial] = useState(false);
  const [showCollect, setShowCollect] = useState(false);

  const onChange = (value: string) => {
    if (value === "PARCIAL") {
      setShowPartial(true);
      return;
    }
    startTransition(() => {
      void changePaymentMethod(service.id, value as "EFECTIVO" | "YAPE" | "PENDIENTE");
    });
  };

  if (service.paymentStatus === "PARCIAL") {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">Parcial</span>
        <button type="button" onClick={() => setShowCollect(true)} className="text-xs font-bold text-accent hover:underline">
          Cobrar saldo {formatSoles(pendingBalance(service))}
        </button>
        {showCollect && (
          <CollectPaymentModal
            serviceId={service.id}
            title="Cobrar saldo pendiente"
            amountLabel={formatSoles(pendingBalance(service))}
            onClose={() => setShowCollect(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <select
        value={service.paymentMethod}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending}
        className="admin-field rounded-lg px-2 py-1 text-xs font-semibold text-fg disabled:opacity-60"
      >
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {PAYMENT_METHOD_LABELS[m]}
          </option>
        ))}
      </select>
      {showPartial && <PartialPaymentModal serviceId={service.id} amount={service.amount} onClose={() => setShowPartial(false)} />}
    </>
  );
}

export function StageCell({ service }: { service: AdminService }) {
  const [isPending, startTransition] = useTransition();
  const [showDelivery, setShowDelivery] = useState(false);

  const onChange = (value: string) => {
    if (value === "ENTREGADO") {
      setShowDelivery(true);
      return;
    }
    startTransition(() => changeEquipmentStage(service.id, value as Exclude<EquipmentStage, "ENTREGADO">));
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        value={service.equipmentStage}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending}
        className="admin-field rounded-lg px-2 py-1 text-xs font-semibold text-fg disabled:opacity-60"
      >
        {EQUIPMENT_STAGES.map((st) => (
          <option key={st} value={st}>
            {EQUIPMENT_STAGE_LABELS[st]}
          </option>
        ))}
      </select>
      {service.equipmentStage === "ENTREGADO" && service.deliveryDate && (
        <span className="text-[10px] text-fg-muted">Entregado: {formatFecha(service.deliveryDate)}</span>
      )}
      {showDelivery && <DeliveryModal serviceId={service.id} onClose={() => setShowDelivery(false)} />}
    </div>
  );
}
