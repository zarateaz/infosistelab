"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { createTransactionRecord } from "./actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_INFO } from "./constants";
import { todayInputValue, parseDateInput } from "./month";
import { ConfirmDialog } from "../ConfirmDialog";
import { AutoGrowInput } from "../AutoGrowInput";

const fieldClass = "admin-field mt-1 w-full rounded-lg px-3 py-1.5 text-sm text-fg";
const fieldLabel = "text-[10px] font-bold uppercase tracking-wider text-fg-muted";

interface Draft {
  description: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  paymentMethod: string;
  date: string;
  notes: string;
}

function emptyDraft(): Draft {
  return {
    description: "",
    type: "INCOME",
    amount: 0,
    paymentMethod: PAYMENT_METHODS[0],
    date: todayInputValue(),
    notes: "",
  };
}

/** Same edit-style grid as TransactionRow, but for creating a new movement
 *  instead of patching an existing one — lets you backfill a forgotten sale
 *  (e.g. "se olvidaron anotar la del 1 de septiembre") right from the table,
 *  without scrolling up to the "Registrar movimiento" card. */
function validate(draft: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!draft.description.trim()) errors.description = "La descripción es obligatoria.";
  else if (draft.description.trim().length > 200) errors.description = "Máximo 200 caracteres.";
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) errors.amount = "El monto debe ser mayor a 0.";
  if (!parseDateInput(draft.date)) errors.date = "Fecha inválida.";
  if (draft.notes.trim().length > 500) errors.notes = "Máximo 500 caracteres.";
  return errors;
}

export function AddTransactionRow() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const errors = useMemo(() => validate(draft), [draft]);
  const isValid = Object.keys(errors).length === 0;

  const startAdd = () => {
    setDraft(emptyDraft());
    setError(null);
    setOpen(true);
  };

  const cancelAdd = () => {
    setOpen(false);
    setError(null);
  };

  const applyAdd = () => {
    startTransition(async () => {
      const result = await createTransactionRecord({
        description: draft.description.trim(),
        type: draft.type,
        amount: draft.amount,
        paymentMethod: draft.paymentMethod as (typeof PAYMENT_METHODS)[number],
        date: draft.date,
        notes: draft.notes.trim() || null,
      });
      if (result.error) {
        setConfirming(false);
        setError(result.error);
        return;
      }
      setConfirming(false);
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <tr className="border-b border-border last:border-0">
        <td colSpan={6} className="px-5 py-3">
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-fg shadow-md shadow-accent/30 transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/40"
          >
            <Plus size={16} strokeWidth={2.5} /> Agregar movimiento
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0 bg-accent/5">
      <td colSpan={6} className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-accent" />
          <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">Nuevo movimiento</p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={fieldLabel}>Fecha</label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className={fieldClass}
            />
            {errors.date && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.date}</p>}
          </div>
          <div>
            <label className={fieldLabel}>Tipo</label>
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })}
              className={fieldClass}
            >
              <option value="INCOME">Ingreso</option>
              <option value="EXPENSE">Gasto</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={fieldLabel}>Descripción</label>
            <AutoGrowInput
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              maxLength={200}
              placeholder="Ej. Venta de funda 15.6"
              className={fieldClass}
            />
            {errors.description && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.description}</p>}
          </div>
          <div>
            <label className={fieldLabel}>Método</label>
            <select
              value={draft.paymentMethod}
              onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value })}
              className={fieldClass}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_INFO[m]?.labelSelect || m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel}>Monto (S/.)</label>
            <input
              type="number"
              step="0.01"
              min={0.01}
              value={draft.amount || ""}
              onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
              className={fieldClass}
            />
            {errors.amount && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.amount}</p>}
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <label className={fieldLabel}>Notas</label>
            <AutoGrowInput
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              maxLength={500}
              className={fieldClass}
            />
            {errors.notes && <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.notes}</p>}
          </div>
        </div>

        {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setConfirming(true)}
            disabled={isPending || !isValid}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-accent to-accent-hover px-5 py-2 text-xs font-bold text-accent-fg shadow-lg shadow-accent/30 transition-all hover:scale-[1.02] hover:shadow-accent/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
          >
            <ShieldCheck size={15} />
            {isPending ? "Guardando..." : "Confirmar movimiento"}
          </button>
          <button
            onClick={cancelAdd}
            disabled={isPending}
            className="text-xs font-semibold text-fg-muted hover:text-fg disabled:opacity-40"
          >
            Cancelar
          </button>
        </div>
      </td>

      {confirming && (
        <ConfirmDialog
          title="Confirmar nuevo movimiento"
          pending={isPending}
          onConfirm={applyAdd}
          onCancel={() => setConfirming(false)}
          fields={[
            { label: "Fecha", value: draft.date },
            { label: "Tipo", value: draft.type === "INCOME" ? "Ingreso" : "Gasto" },
            { label: "Descripción", value: draft.description.trim() },
            { label: "Método", value: draft.paymentMethod },
            { label: "Monto", value: `S/. ${draft.amount.toFixed(2)}` },
            ...(draft.notes.trim() ? [{ label: "Notas", value: draft.notes.trim() }] : []),
          ]}
        />
      )}
    </tr>
  );
}
