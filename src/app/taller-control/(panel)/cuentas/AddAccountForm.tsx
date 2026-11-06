"use client";

import { useActionState, useEffect, useRef } from "react";
import { createReceivable, createPayable, type AccountFormState } from "./actions";
import { DOCUMENT_TYPES, PAYMENT_METHODS } from "./constants";
import { AutoGrowInput } from "../AutoGrowInput";

const initialState: AccountFormState = {};
const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";
const inputClass = "admin-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-fg";

export function AddAccountForm({ kind }: { kind: "cobrar" | "pagar" }) {
  const action = kind === "cobrar" ? createReceivable : createPayable;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error && !isPending) formRef.current?.reset();
  }, [state, isPending]);

  const partyLabel = kind === "cobrar" ? "Cliente" : "Proveedor";
  const partyName = kind === "cobrar" ? "clientName" : "providerName";

  return (
    <div className="admin-glass rounded-[var(--radius-lg)] p-6">
      <h2 className="font-display text-lg font-bold text-fg">
        {kind === "cobrar" ? "Nueva cuenta por cobrar" : "Nueva cuenta por pagar"}
      </h2>

      <form ref={formRef} action={formAction} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass} htmlFor={partyName}>
            {partyLabel}
          </label>
          <input id={partyName} name={partyName} type="text" required maxLength={150} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="ruc">
            RUC (opcional)
          </label>
          <input id="ruc" name="ruc" type="text" maxLength={20} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="documentType">
            Documento
          </label>
          <select id="documentType" name="documentType" defaultValue="" className={inputClass}>
            <option value="">Sin comprobante</option>
            {DOCUMENT_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="concept">
            Concepto
          </label>
          <AutoGrowInput id="concept" name="concept" required maxLength={200} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="issueDate">
            Fecha de emisión
          </label>
          <input
            id="issueDate"
            name="issueDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="dueDate">
            Vencimiento
          </label>
          <input id="dueDate" name="dueDate" type="date" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="total">
            Total (S/.)
          </label>
          <input id="total" name="total" type="number" min={0.01} step={0.01} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="settled">
            {kind === "cobrar" ? "Cobrado" : "Pagado"} (S/.) — opcional
          </label>
          <input id="settled" name="settled" type="number" min={0} step={0.01} defaultValue={0} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="paymentMethod">
            Medio de {kind === "cobrar" ? "cobro" : "pago"} — opcional
          </label>
          <select id="paymentMethod" name="paymentMethod" defaultValue="" className={inputClass}>
            <option value="">Sin definir</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="notes">
            Observaciones
          </label>
          <AutoGrowInput id="notes" name="notes" maxLength={500} className={inputClass} />
        </div>

        {state.error && <p className="text-sm font-medium text-red-600 sm:col-span-2 lg:col-span-4">{state.error}</p>}

        <div className="sm:col-span-2 lg:col-span-4">
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
