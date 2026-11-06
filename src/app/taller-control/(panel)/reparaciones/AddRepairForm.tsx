"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRepair, type RepairFormState } from "./actions";

const initialState: RepairFormState = {};
const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";
const inputClass = "admin-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-fg";

export function AddRepairForm() {
  const [state, formAction, isPending] = useActionState(createRepair, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error && !isPending) formRef.current?.reset();
  }, [state, isPending]);

  return (
    <div className="admin-glass rounded-[var(--radius-lg)] p-6">
      <h2 className="font-display text-lg font-bold text-fg">Registrar nueva reparación</h2>

      <form ref={formRef} action={formAction} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="dni">
            DNI del cliente
          </label>
          <input id="dni" name="dni" type="text" required maxLength={20} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="equipment">
            Equipo
          </label>
          <input
            id="equipment"
            name="equipment"
            type="text"
            placeholder="Ej. Laptop Dell"
            required
            maxLength={150}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="problem">
            Problema reportado
          </label>
          <textarea id="problem" name="problem" required rows={3} maxLength={1000} className={inputClass} />
        </div>

        {state.error && <p className="sm:col-span-2 text-sm font-medium text-red-600">{state.error}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {isPending ? "Registrando..." : "Registrar reparación"}
          </button>
        </div>
      </form>
    </div>
  );
}
