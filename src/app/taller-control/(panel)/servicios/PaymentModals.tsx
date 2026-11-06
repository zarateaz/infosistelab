"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { registerPartialPayment, collectPayment, markAsDelivered, type PayNowMethod } from "./actions";
import { PAY_NOW_METHODS, PAYMENT_METHOD_LABELS, formatSoles } from "./utils";
import { todayInputValue } from "../caja/month";

const inputClass = "admin-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-fg";
const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-bg-alt p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-fg">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-bg">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Registrar un adelanto — igual que el modal "Registrar pago parcial" del
 *  diseño original: exige un adelanto > 0 y menor al total, más su forma
 *  de pago. La validación real vive en el servidor (registerPartialPayment);
 *  esto solo evita un viaje al servidor con datos que ya sabemos inválidos. */
export function PartialPaymentModal({ serviceId, amount, onClose }: { serviceId: string; amount: number; onClose: () => void }) {
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [method, setMethod] = useState<PayNowMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saldo = Math.max(amount - advanceAmount, 0);

  const confirm = () => {
    if (!advanceAmount || advanceAmount <= 0) { setError("Ingresa un monto de adelanto válido."); return; }
    if (advanceAmount >= amount) { setError("El adelanto no puede ser igual o mayor al monto total."); return; }
    if (!method) { setError("Selecciona la forma de pago del adelanto."); return; }
    startTransition(async () => {
      const result = await registerPartialPayment(serviceId, { advanceAmount, advancePaymentMethod: method });
      if (result.error) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <ModalShell title="Registrar pago parcial" onClose={onClose}>
      <p className="mt-2 text-sm text-fg-muted">Monto total del servicio: <strong className="text-fg">{formatSoles(amount)}</strong></p>
      <div className="mt-4">
        <label className={labelClass}>Monto del adelanto (S/.)</label>
        <input type="number" step="0.01" min="0.01" onChange={(e) => setAdvanceAmount(Number(e.target.value) || 0)} className={inputClass} />
        {advanceAmount > 0 && <p className="mt-1 text-xs font-semibold text-fg-muted">Saldo restante: {formatSoles(saldo)}</p>}
      </div>
      <div className="mt-3">
        <label className={labelClass}>Forma de pago del adelanto</label>
        <div className="mt-1.5 flex gap-2">
          {PAY_NOW_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-colors ${
                method === m ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-fg-muted"
              }`}
            >
              {PAYMENT_METHOD_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      <div className="mt-5 flex items-center justify-end gap-3">
        <button onClick={onClose} disabled={isPending} className="text-xs font-semibold text-fg-muted hover:text-fg">
          Cancelar
        </button>
        <button
          onClick={confirm}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ShieldCheck size={14} /> {isPending ? "Guardando..." : "Guardar adelanto"}
        </button>
      </div>
    </ModalShell>
  );
}

/** Cobrar (un servicio PENDIENTE) o cobrar el saldo (uno PARCIAL) — misma
 *  acción de servidor para ambos casos, ver collectPayment. */
export function CollectPaymentModal({
  serviceId,
  amountLabel,
  title,
  onClose,
}: {
  serviceId: string;
  amountLabel: string;
  title: string;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PayNowMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    if (!method) { setError("Selecciona Efectivo o Yape."); return; }
    startTransition(async () => {
      const result = await collectPayment(serviceId, method);
      if (result.error) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="mt-2 text-sm text-fg-muted">
        Selecciona la forma de pago recibida por <strong className="text-fg">{amountLabel}</strong>
      </p>
      <div className="mt-4 flex gap-2">
        {PAY_NOW_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-bold transition-colors ${
              method === m ? "border-accent bg-accent/10 text-accent" : "border-border-strong text-fg-muted"
            }`}
          >
            {PAYMENT_METHOD_LABELS[m]}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      <div className="mt-5 flex items-center justify-end gap-3">
        <button onClick={onClose} disabled={isPending} className="text-xs font-semibold text-fg-muted hover:text-fg">
          Cancelar
        </button>
        <button
          onClick={confirm}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ShieldCheck size={14} /> {isPending ? "Guardando..." : "Confirmar pago"}
        </button>
      </div>
    </ModalShell>
  );
}

/** Confirmar fecha de entrega — al elegir la etapa "Entregado" desde el
 *  selector, igual que el modal del diseño original. */
export function DeliveryModal({ serviceId, onClose }: { serviceId: string; onClose: () => void }) {
  const [date, setDate] = useState(todayInputValue());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const result = await markAsDelivered(serviceId, date);
      if (result.error) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <ModalShell title="Marcar como entregado" onClose={onClose}>
      <p className="mt-2 text-sm text-fg-muted">Confirma la fecha en que se entregó el equipo al cliente</p>
      <div className="mt-4">
        <label className={labelClass}>Fecha de entrega</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      <div className="mt-5 flex items-center justify-end gap-3">
        <button onClick={onClose} disabled={isPending} className="text-xs font-semibold text-fg-muted hover:text-fg">
          Cancelar
        </button>
        <button
          onClick={confirm}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <ShieldCheck size={14} /> {isPending ? "Guardando..." : "Confirmar entrega"}
        </button>
      </div>
    </ModalShell>
  );
}
