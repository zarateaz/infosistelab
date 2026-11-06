"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2, Pencil, ShieldCheck, Banknote } from "lucide-react";
import { updateTransaction, deleteTransaction, type AdminTransaction } from "./actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_INFO } from "./constants";
import { YapeIcon } from "@/components/icons/YapeIcon";
import { dateToInputValue, parseDateInput } from "./month";
import { ConfirmDialog } from "../ConfirmDialog";
import { AutoGrowInput } from "../AutoGrowInput";
import { CajaHoverTooltip } from "./CajaHoverTooltip";

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

function draftFrom(t: AdminTransaction): Draft {
  return {
    description: t.description,
    type: t.type,
    amount: t.amount,
    paymentMethod: t.paymentMethod,
    date: dateToInputValue(new Date(t.date)),
    notes: t.notes ?? "",
  };
}

/** Mirrors the zod rules in actions.ts so the "Confirmar" button only
 *  lights up once the server would actually accept the patch — catching
 *  typos before the confirm dialog, not after a failed round-trip. */
function validate(draft: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!draft.description.trim()) errors.description = "La descripción es obligatoria.";
  else if (draft.description.trim().length > 200) errors.description = "Máximo 200 caracteres.";
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) errors.amount = "El monto debe ser mayor a 0.";
  if (!parseDateInput(draft.date)) errors.date = "Fecha inválida.";
  if (draft.notes.trim().length > 500) errors.notes = "Máximo 500 caracteres.";
  return errors;
}

function PaymentMethodBadge({ method }: { method: string }) {
  if (method === "YAPE 1") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#742284]/10 dark:bg-[#742284]/25 px-2 py-0.5 text-xs font-semibold text-[#742284] dark:text-[#c084fc] border border-[#742284]/20 shadow-xs">
        <YapeIcon size={16} className="rounded-xs" />
        <span>Yape 1</span>
        <span className="text-[10px] opacity-75 font-normal">(Edgar)</span>
      </span>
    );
  }
  if (method === "YAPE 2") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#742284]/10 dark:bg-[#742284]/25 px-2 py-0.5 text-xs font-semibold text-[#742284] dark:text-[#c084fc] border border-[#742284]/20 shadow-xs">
        <YapeIcon size={16} className="rounded-xs" />
        <span>Yape 2</span>
        <span className="text-[10px] opacity-75 font-normal">(Caja)</span>
      </span>
    );
  }
  if (method === "EFECTIVO") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
        <Banknote size={13} className="shrink-0" />
        <span>Efectivo</span>
      </span>
    );
  }
  return <span className="text-xs text-fg-muted font-medium">{method}</span>;
}

export function TransactionRow({ transaction }: { transaction: AdminTransaction }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(transaction));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const errors = useMemo(() => validate(draft), [draft]);
  const isValid = Object.keys(errors).length === 0;

  const startEdit = () => {
    setDraft(draftFrom(transaction));
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const applyEdit = () => {
    startTransition(async () => {
      const result = await updateTransaction(transaction.id, {
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
      setEditing(false);
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deleteTransaction(transaction.id);
      setConfirmingDelete(false);
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-border last:border-0 bg-accent/5">
        <td colSpan={6} className="px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-accent" />
            <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">Editando movimiento</p>
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
                value={draft.amount}
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
              {isPending ? "Guardando..." : "Confirmar cambios"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={isPending}
              className="text-xs font-semibold text-fg-muted hover:text-fg disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </td>

        {confirming && (
          <ConfirmDialog
            title="Confirmar cambios del movimiento"
            pending={isPending}
            onConfirm={applyEdit}
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

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-2.5 text-fg-muted">{dateToInputValue(new Date(transaction.date))}</td>
      <td className="px-5 py-2.5">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            transaction.type === "INCOME" ? "bg-accent/10 text-accent" : "bg-red-50 text-red-600"
          }`}
        >
          {transaction.type === "INCOME" ? "Ingreso" : "Gasto"}
        </span>
      </td>
      <td className="px-5 py-2.5 font-semibold text-fg">
        <CajaHoverTooltip
          content={transaction.description}
          title="Concepto del Movimiento"
          type={transaction.type}
          amount={transaction.amount}
          paymentMethod={transaction.paymentMethod}
          date={dateToInputValue(new Date(transaction.date))}
          notes={transaction.notes}
          minLength={1}
        >
          <span className="cursor-help hover:text-accent transition-colors">{transaction.description}</span>
        </CajaHoverTooltip>
      </td>
      <td className="px-5 py-2.5">
        <PaymentMethodBadge method={transaction.paymentMethod} />
      </td>
      <td className={`px-5 py-2.5 font-bold ${transaction.type === "INCOME" ? "text-accent" : "text-red-600"}`}>
        S/. {transaction.amount.toFixed(2)}
      </td>
      <td className="px-5 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={startEdit}
            disabled={isPending}
            aria-label={`Editar ${transaction.description}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-accent/10 hover:text-accent disabled:opacity-40"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            disabled={isPending}
            aria-label={`Eliminar ${transaction.description}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar movimiento"
          message={`¿Eliminar el movimiento "${transaction.description}"? Se moverá a la Papelera — puedes restaurarlo después.`}
          danger
          pending={isPending}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </tr>
  );
}
