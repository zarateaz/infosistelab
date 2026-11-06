"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTransaction, type TransactionFormState } from "./actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_INFO } from "./constants";
import { todayInputValue } from "./month";
import { AutoGrowInput } from "../AutoGrowInput";

const initialState: TransactionFormState = {};
const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";
const inputClass = "admin-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-fg";

export function AddTransactionForm({ month }: { month?: string }) {
  const [state, formAction, isPending] = useActionState(createTransaction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const typeSelectRef = useRef<HTMLSelectElement>(null);
  const methodSelectRef = useRef<HTMLSelectElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Default to today if viewing current month, or the 1st of the selected month
  const [date, setDate] = useState(() => {
    const today = todayInputValue();
    if (month && !today.startsWith(month)) {
      return `${month}-01`;
    }
    return today;
  });

  const handlePreFillOpening = () => {
    if (formRef.current) {
      const openingDate = month ? `${month}-01` : todayInputValue();
      setDate(openingDate);
      if (dateInputRef.current) dateInputRef.current.value = openingDate;
      if (typeSelectRef.current) typeSelectRef.current.value = "INCOME";
      if (methodSelectRef.current) methodSelectRef.current.value = "EFECTIVO";
      const descInput = formRef.current.querySelector('input[name="description"]') as HTMLInputElement;
      if (descInput) {
        descInput.value = "SALDO INICIAL - APERTURA DE CAJA";
      }
      if (amountInputRef.current) {
        amountInputRef.current.value = "";
        amountInputRef.current.focus();
      }
    }
  };

  useEffect(() => {
    if (!state.error && !isPending) {
      formRef.current?.reset();
      if (dateInputRef.current) dateInputRef.current.value = date;
    }
  }, [state, isPending, date]);

  return (
    <div className="admin-glass rounded-[var(--radius-lg)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-fg">Registrar movimiento</h2>
        <button
          type="button"
          onClick={handlePreFillOpening}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-bold text-accent transition-colors hover:bg-accent/20 active:scale-95"
          title="Autocompletar para registrar apertura de caja con saldo inicial"
        >
          <span>🌱 Apertura / Saldo Inicial</span>
        </button>
      </div>

      <form ref={formRef} action={formAction} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className={labelClass} htmlFor="description">
            Descripción
          </label>
          <AutoGrowInput id="description" name="description" required maxLength={200} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="date">
            Fecha
          </label>
          <input
            ref={dateInputRef}
            id="date"
            name="date"
            type="date"
            required
            defaultValue={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="type">
            Tipo
          </label>
          <select id="type" name="type" defaultValue="INCOME" className={inputClass}>
            <option value="INCOME">Ingreso</option>
            <option value="EXPENSE">Gasto</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="amount">
            Monto (S/.)
          </label>
          <input id="amount" name="amount" type="number" min={0.01} step={0.01} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="paymentMethod">
            Método
          </label>
          <select id="paymentMethod" name="paymentMethod" defaultValue={PAYMENT_METHODS[0]} className={inputClass}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_INFO[m]?.labelSelect || m}
              </option>
            ))}
          </select>
        </div>

        {state.error && <p className="text-sm font-medium text-red-600 sm:col-span-2 lg:col-span-5">{state.error}</p>}

        <div className="sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {isPending ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
