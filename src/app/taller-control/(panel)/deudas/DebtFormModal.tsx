"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Hash,
  MapPin,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Tag,
  User,
  Wallet,
} from "lucide-react";
import { createDebt, updateDebt } from "./actions";
import {
  CATEGORY_INFO,
  DEBT_CATEGORIES,
  dueDateFor,
  fmtDate,
  type DebtCategory,
  type DebtRow,
} from "./deudas";
import { ModalShell, modalInput, modalLabel } from "./ModalShell";

/** Plantillas rápidas sacadas de las columnas del Excel de pagos. */
const TEMPLATES: { label: string; name: string; category: DebtCategory; dueDay: number; isVariable?: boolean }[] = [
  { label: "Alquiler", name: "Alquiler local ", category: "ALQUILER", dueDay: 1 },
  { label: "Luz", name: "Luz — ", category: "SERVICIOS", dueDay: 14, isVariable: true },
  { label: "Internet", name: "Internet ", category: "INTERNET", dueDay: 30 },
  { label: "Celular", name: "Celular ", category: "CELULAR", dueDay: 5 },
  { label: "Sueldo", name: "Sueldo ", category: "PERSONAL", dueDay: 30 },
  { label: "SUNAT", name: "SUNAT — ", category: "IMPUESTOS", dueDay: 20, isVariable: true },
  { label: "Préstamo", name: "Cuota préstamo ", category: "PRESTAMOS", dueDay: 15 },
];

export function DebtFormModal({
  debt,
  defaultMonth,
  onClose,
}: {
  debt: DebtRow | null; // null = nueva obligación
  defaultMonth: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(debt?.name ?? "");
  const [category, setCategory] = useState<DebtCategory>(debt?.category ?? "SERVICIOS");
  const [payee, setPayee] = useState(debt?.payee ?? "");
  const [location, setLocation] = useState(debt?.location ?? "");
  const [reference, setReference] = useState(debt?.reference ?? "");
  const [payTo, setPayTo] = useState(debt?.payTo ?? "");
  const [phone, setPhone] = useState(debt?.phone ?? "");
  const [dueDay, setDueDay] = useState<number | string>(debt?.dueDay ?? 1);
  const [amount, setAmount] = useState<number | string>(debt ? debt.amount : "");
  const [isVariable, setIsVariable] = useState(debt?.isVariable ?? false);
  const [startMonth, setStartMonth] = useState(debt?.startMonth ?? defaultMonth);
  const [hasEnd, setHasEnd] = useState(Boolean(debt?.endMonth));
  const [endMonth, setEndMonth] = useState(debt?.endMonth ?? "");
  const [notes, setNotes] = useState(debt?.notes ?? "");

  const day = Number(dueDay);
  const preview = day >= 1 && day <= 31 ? dueDateFor(startMonth || defaultMonth, day) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = {
      name,
      category,
      payee,
      location,
      reference,
      payTo,
      phone,
      dueDay: Number(dueDay),
      amount: Number(amount) || 0,
      isVariable,
      startMonth,
      endMonth: hasEnd ? endMonth : null,
      notes,
    };
    startTransition(async () => {
      const res = debt ? await updateDebt(debt.id, input) : await createDebt(input);
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  return (
    <ModalShell
      title={debt ? "Editar obligación" : "Nueva obligación mensual"}
      subtitle={debt ? debt.name : "Alquiler, luz, internet, sueldos, impuestos, cuotas…"}
      icon={debt ? <Pencil size={19} /> : <Plus size={20} />}
      onClose={onClose}
      busy={isPending}
    >
      <form onSubmit={submit} className="space-y-5 p-6">
        {!debt && (
          <div>
            <p className={modalLabel}>Plantillas rápidas</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    setName(t.name);
                    setCategory(t.category);
                    setDueDay(t.dueDay);
                    setIsVariable(Boolean(t.isVariable));
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={modalLabel} htmlFor="debt-name">
            <Tag size={13} className="text-blue-600" /> Nombre de la obligación
          </label>
          <input
            id="debt-name"
            required
            maxLength={150}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={modalInput}
            placeholder="Ej. Alquiler S-25 — Sra. Julia"
          />
        </div>

        <div>
          <p className={modalLabel}>Categoría</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {DEBT_CATEGORIES.map((c) => {
              const info = CATEGORY_INFO[c];
              const selected = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${info.dot}`} />
                  <span className="truncate">{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={modalLabel} htmlFor="debt-amount">
              <Wallet size={13} className="text-emerald-600" /> Monto mensual (S/)
            </label>
            <input
              id="debt-amount"
              type="number"
              min={0}
              step={0.01}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={modalInput}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={modalLabel} htmlFor="debt-day">
              <CalendarClock size={13} className="text-amber-600" /> Día de pago
            </label>
            <input
              id="debt-day"
              type="number"
              min={1}
              max={31}
              required
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className={modalInput}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={isVariable}
              onChange={(e) => setIsVariable(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Monto varía cada mes
          </label>
        </div>
        {preview && (
          <p className="-mt-2 text-[11px] font-semibold text-slate-500">
            Primer vencimiento: <span className="text-slate-800">{fmtDate(preview)}</span>
            {day > 28 && " · en meses más cortos vence el último día"}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={modalLabel} htmlFor="debt-payee">
              <User size={13} className="text-violet-600" /> Beneficiario / proveedor
            </label>
            <input
              id="debt-payee"
              maxLength={120}
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className={modalInput}
              placeholder="Ej. Sra. Julia, Claro, SUNAT"
            />
          </div>
          <div>
            <label className={modalLabel} htmlFor="debt-location">
              <MapPin size={13} className="text-rose-600" /> Local
            </label>
            <input
              id="debt-location"
              maxLength={40}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={modalInput}
              placeholder="Ej. S-25, B-10, E-10"
            />
          </div>
          <div>
            <label className={modalLabel} htmlFor="debt-ref">
              <Hash size={13} className="text-blue-600" /> Código de pago / suministro
            </label>
            <input
              id="debt-ref"
              maxLength={120}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={modalInput}
              placeholder="Ej. H55460149, 67262652"
            />
          </div>
          <div>
            <label className={modalLabel} htmlFor="debt-phone">
              <Phone size={13} className="text-emerald-600" /> Celular del beneficiario
            </label>
            <input
              id="debt-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={modalInput}
              placeholder="Ej. 943 458 592 (para enviar constancia)"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={modalLabel} htmlFor="debt-payto">
              <Wallet size={13} className="text-amber-600" /> Dónde se paga
            </label>
            <input
              id="debt-payto"
              maxLength={160}
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              className={modalInput}
              placeholder="Ej. Yape 943 458 592 · Cta. Caja Huancayo 107002211005170494 · QR"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={modalLabel} htmlFor="debt-start">
              <CalendarClock size={13} className="text-blue-600" /> Aplica desde
            </label>
            <input
              id="debt-start"
              type="month"
              required
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className={modalInput}
            />
          </div>
          <div>
            <label className={`${modalLabel} cursor-pointer`}>
              <input
                type="checkbox"
                checked={hasEnd}
                onChange={(e) => setHasEnd(e.target.checked)}
                className="h-3.5 w-3.5 accent-blue-600"
              />
              Tiene mes final (cuotas)
            </label>
            <input
              type="month"
              disabled={!hasEnd}
              required={hasEnd}
              value={endMonth}
              min={startMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className={`${modalInput} disabled:opacity-40`}
            />
          </div>
        </div>

        <div>
          <label className={modalLabel} htmlFor="debt-notes">
            <StickyNote size={13} className="text-amber-600" /> Notas
          </label>
          <textarea
            id="debt-notes"
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${modalInput} resize-none`}
            placeholder="Ej. Se paga uno de los 2 recibos (S25 y B10)"
          />
        </div>

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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            <Check size={16} /> {isPending ? "Guardando…" : debt ? "Guardar cambios" : "Crear obligación"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
