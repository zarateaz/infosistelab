"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarCheck,
  Check,
  Copy,
  MessageCircle,
  ReceiptText,
  RotateCcw,
  StickyNote,
  Wallet,
} from "lucide-react";
import { registerDebtPayment, undoDebtPayment } from "./actions";
import {
  DEBT_PAYMENT_METHODS,
  dueText,
  fmtDate,
  isCashboxMethod,
  money,
  paymentWhatsappLink,
  periodLabel,
  periodState,
  shiftPeriod,
  type DebtPaymentMethod,
  type DebtRow,
} from "./deudas";
import { ModalShell, modalInput, modalLabel } from "./ModalShell";

export function PaymentModal({
  debt,
  period,
  today,
  onClose,
}: {
  debt: DebtRow;
  period: string;
  today: string;
  onClose: () => void;
}) {
  const st = periodState(debt, period, today);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Historial reciente para sugerir montos en servicios variables (luz, IGV…)
  const history = Array.from({ length: 6 }, (_, i) => shiftPeriod(period, -(6 - i))).map((p) => ({
    period: p,
    payment: debt.payments.find((x) => x.period === p) ?? null,
  }));
  const lastPaid = [...history].reverse().find((h) => h.payment)?.payment ?? null;
  const maxHist = Math.max(debt.amount, ...history.map((h) => h.payment?.amount ?? 0), 1);

  const [amount, setAmount] = useState<number | string>(debt.amount > 0 ? debt.amount : "");
  const [paidAt, setPaidAt] = useState(today);
  const [method, setMethod] = useState<DebtPaymentMethod>("YAPE 1");
  const [note, setNote] = useState("");
  const [addToCashbox, setAddToCashbox] = useState(false);
  const cashboxAllowed = isCashboxMethod(method);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await registerDebtPayment({
        debtId: debt.id,
        period,
        amount: Number(amount),
        paidAt,
        method,
        note,
        addToCashbox: cashboxAllowed && addToCashbox,
      });
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  const undo = () => {
    if (!st.payment) return;
    const extra = st.payment.inCashbox ? "\n\nEl egreso registrado en Caja se enviará a la Papelera." : "";
    if (!confirm(`¿Deshacer el pago de ${debt.name} (${periodLabel(period)})?${extra}`)) return;
    startTransition(async () => {
      const res = await undoDebtPayment(st.payment!.id);
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  const copyRef = async () => {
    if (!debt.reference) return;
    try {
      await navigator.clipboard.writeText(debt.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* portapapeles no disponible (http) — no es crítico */
    }
  };

  const wa = paymentWhatsappLink(debt, st);
  const statusTone =
    st.status === "PAGADO"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : st.status === "VENCIDO"
        ? "bg-red-50 text-red-700 ring-red-200"
        : st.status === "POR_VENCER"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-slate-50 text-slate-600 ring-slate-200";

  return (
    <ModalShell
      title={st.payment ? "Pago registrado" : "Registrar pago"}
      subtitle={`${debt.name} · ${periodLabel(period)}`}
      icon={st.payment ? <ReceiptText size={19} /> : <Banknote size={20} />}
      iconClass={
        st.payment ? "from-emerald-500 to-teal-600 shadow-emerald-500/25" : "from-blue-600 to-indigo-600 shadow-blue-500/25"
      }
      onClose={onClose}
      busy={isPending}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 p-6">
        {/* Ficha de la obligación */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-xs text-slate-600">
              {debt.payee && <p className="font-bold text-slate-800">{debt.payee}</p>}
              {debt.payTo && <p className="mt-0.5">{debt.payTo}</p>}
              {debt.reference && (
                <button
                  type="button"
                  onClick={copyRef}
                  title="Copiar código"
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-blue-400"
                >
                  {debt.reference}
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${statusTone}`}>
              {st.status === "PAGADO" ? "Pagado" : dueText(st.daysLeft)}
            </span>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">
            Vence el <span className="text-slate-800">{fmtDate(st.dueDate)}</span> · Monto referencial{" "}
            <span className="text-slate-800">{money(debt.amount)}</span>
            {debt.isVariable && " (varía cada mes)"}
          </p>

          {/* Historial de 6 meses */}
          <div className="mt-3 flex items-end gap-1.5">
            {history.map((h) => (
              <div key={h.period} className="flex flex-1 flex-col items-center gap-1" title={h.payment ? money(h.payment.amount) : "Sin pago"}>
                <div className="flex h-10 w-full items-end">
                  <div
                    className={`w-full rounded-t ${h.payment ? "bg-emerald-500/80" : "bg-slate-200"}`}
                    style={{ height: `${h.payment ? Math.max(12, (h.payment.amount / maxHist) * 100) : 8}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-400">{periodLabel(h.period, true).slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>

        {st.payment ? (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Monto pagado</dt>
                <dd className="mt-0.5 font-display text-xl font-extrabold text-emerald-800">{money(st.payment.amount)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha / medio</dt>
                <dd className="mt-0.5 font-bold text-slate-800">{fmtDate(st.payment.paidAt)}</dd>
                <dd className="text-xs font-semibold text-slate-500">{st.payment.method}</dd>
              </div>
            </dl>
            {st.payment.note && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                <StickyNote size={13} className="mt-0.5 shrink-0" /> {st.payment.note}
              </p>
            )}
            {st.payment.inCashbox && (
              <p className="text-xs font-semibold text-blue-700">✓ Registrado también como egreso en Caja.</p>
            )}
            {error && (
              <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                <AlertCircle size={16} /> {error}
              </p>
            )}
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={undo}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <RotateCcw size={15} /> Deshacer pago
              </button>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-700"
                >
                  <MessageCircle size={15} /> Enviar constancia
                </a>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={modalLabel} htmlFor="pay-amount">
                  <Wallet size={13} className="text-emerald-600" /> Monto pagado (S/)
                </label>
                <input
                  id="pay-amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${modalInput} text-lg`}
                />
                {lastPaid && Number(amount) !== lastPaid.amount && (
                  <button
                    type="button"
                    onClick={() => setAmount(lastPaid.amount)}
                    className="mt-1.5 text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Usar último pago ({money(lastPaid.amount)})
                  </button>
                )}
              </div>
              <div>
                <label className={modalLabel} htmlFor="pay-date">
                  <CalendarCheck size={13} className="text-blue-600" /> Fecha de pago
                </label>
                <input
                  id="pay-date"
                  type="date"
                  required
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className={modalInput}
                />
              </div>
            </div>

            <div>
              <p className={modalLabel}>Medio de pago</p>
              <div className="grid grid-cols-3 gap-1.5">
                {DEBT_PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-xl border px-2 py-2 text-[11px] font-extrabold transition-all ${
                      method === m
                        ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={modalLabel} htmlFor="pay-note">
                <StickyNote size={13} className="text-amber-600" /> Nota (opcional)
              </label>
              <input
                id="pay-note"
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={modalInput}
                placeholder="Ej. N° de operación 123456, pagó Julia"
              />
            </div>

            <label
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs transition-colors ${
                cashboxAllowed ? "cursor-pointer border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                disabled={!cashboxAllowed}
                checked={cashboxAllowed && addToCashbox}
                onChange={(e) => setAddToCashbox(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
              <span>
                <span className="block font-extrabold text-slate-800">Registrar también como egreso en Caja</span>
                <span className="font-medium text-slate-500">
                  {cashboxAllowed
                    ? `Se descontará ${Number(amount) > 0 ? money(Number(amount)) : "el monto"} de ${method} en la Caja del día ${fmtDate(paidAt || today)}.`
                    : "Disponible solo para Efectivo, Yape 1 y Yape 2."}
                </span>
              </span>
            </label>

            {error && (
              <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                <AlertCircle size={16} /> {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 hover:opacity-95 disabled:opacity-60"
              >
                <Check size={16} /> {isPending ? "Guardando…" : "Confirmar pago"}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}
