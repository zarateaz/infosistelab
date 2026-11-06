"use client";

import { useState, useTransition } from "react";
import { Trash2, CircleCheck, Banknote } from "lucide-react";
import { updateTransaction, deleteTransaction, type AdminTransaction } from "./actions";
import { PAYMENT_METHODS } from "./constants";
import { dateToInputValue, parseDateInput } from "./month";
import { ConfirmDialog } from "../ConfirmDialog";
import { CajaHoverTooltip } from "./CajaHoverTooltip";
import { YapeIcon } from "@/components/icons/YapeIcon";

// UTC getters — see dateToInputValue's comment in month.ts for why: this
// reads a STORED transaction date, and local getters here would show a
// different day depending on which machine (dev box vs. VPS) renders it.
function formatDate(date: Date): string {
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function money(n: number): string {
  return n === 0 ? "" : `S/. ${n.toFixed(2)}`;
}

const cellInputClass =
  "w-full rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs outline-none focus:border-accent focus:bg-bg";

interface Draft {
  description: string;
  amount: number;
  paymentMethod: string;
  date: string;
}

function draftFrom(t: AdminTransaction): Draft {
  return {
    description: t.description,
    amount: t.amount,
    paymentMethod: t.paymentMethod,
    date: dateToInputValue(new Date(t.date)),
  };
}

function isDirty(draft: Draft, t: AdminTransaction): boolean {
  return (
    draft.description !== t.description ||
    draft.amount !== t.amount ||
    draft.paymentMethod !== t.paymentMethod ||
    draft.date !== dateToInputValue(new Date(t.date))
  );
}

/** Mini badge colorido de la cuenta (Efectivo, Yape 1 o Yape 2) para mostrar junto al concepto */
function MethodColorPill({ method }: { method: string }) {
  if (method === "EFECTIVO") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 shadow-2xs"
        title="Cuenta: Efectivo (Caja Física)"
      >
        <Banknote size={11} className="shrink-0" />
        <span>EFECT.</span>
      </span>
    );
  }
  if (method === "YAPE 1") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#742284]/40 bg-[#742284]/15 dark:bg-[#742284]/35 px-1.5 py-0.5 text-[10px] font-extrabold text-[#742284] dark:text-[#e9d5ff] shadow-2xs"
        title="Cuenta: Yape 1 — Laboratorio INFOSISTEL"
      >
        <YapeIcon size={12} className="shrink-0 rounded-2xs" />
        <span>YAPE 1</span>
      </span>
    );
  }
  if (method === "YAPE 2") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-fuchsia-500/40 bg-fuchsia-500/15 dark:bg-fuchsia-500/30 px-1.5 py-0.5 text-[10px] font-extrabold text-fuchsia-700 dark:text-fuchsia-200 shadow-2xs"
        title="Cuenta: Yape 2 — Yape Caja"
      >
        <YapeIcon size={12} className="shrink-0 rounded-2xs" />
        <span>YAPE 2</span>
      </span>
    );
  }
  return null;
}

/** Estilo colorido para el selector de método en la columna derecha de acciones */
function getMethodSelectStyle(method: string): string {
  if (method === "EFECTIVO") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-extrabold focus:border-emerald-500";
  }
  if (method === "YAPE 1") {
    return "border-[#742284]/40 bg-[#742284]/15 dark:bg-[#742284]/35 text-[#742284] dark:text-[#e9d5ff] font-extrabold focus:border-[#742284]";
  }
  if (method === "YAPE 2") {
    return "border-fuchsia-500/40 bg-fuchsia-500/15 dark:bg-fuchsia-500/30 text-fuchsia-800 dark:text-fuchsia-200 font-extrabold focus:border-fuchsia-500";
  }
  return "border-border text-fg font-semibold";
}

function getLeftAccentBorder(method: string): string {
  if (method === "EFECTIVO") return "border-l-4 border-l-emerald-500";
  if (method === "YAPE 1") return "border-l-4 border-l-[#742284]";
  if (method === "YAPE 2") return "border-l-4 border-l-fuchsia-500";
  return "";
}

/** Same fields editable as TransactionRow.tsx (the all-time table above),
 *  adapted to the report's wider per-method columns — type (Ingreso/Gasto)
 *  stays fixed once created: converting an income into an expense in place
 *  is unusual enough, and would jump the amount across the ING./EGR.
 *  column groups, that delete-and-recreate is clearer here. Every other
 *  field — fecha, descripción, método, monto — is editable, and nothing
 *  saves until "Confirmar cambios" is clicked, same guard as TransactionRow. */
export function MonthlyReportRow({
  transaction,
  running,
}: {
  transaction: AdminTransaction;
  running: number;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(transaction));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isIncome = transaction.type === "INCOME";
  const dirty = isDirty(draft, transaction);
  const dateValid = parseDateInput(draft.date) !== null;
  const descValid = draft.description.trim().length > 0 && draft.description.trim().length <= 200;
  const amountValid = Number.isFinite(draft.amount) && draft.amount > 0;
  const isValid = dateValid && descValid && amountValid;

  const applyEdit = () => {
    startTransition(async () => {
      const result = await updateTransaction(transaction.id, {
        description: draft.description.trim(),
        amount: draft.amount,
        paymentMethod: draft.paymentMethod as (typeof PAYMENT_METHODS)[number],
        date: draft.date,
      });
      setConfirming(false);
      setError(result.error ?? null);
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deleteTransaction(transaction.id);
      setConfirmingDelete(false);
    });
  };

  return (
    <>
      <tr
        className={`group transition-colors ${
          dirty ? "bg-accent/10" : "hover:bg-accent/[0.03]"
        }`}
      >
        {/* Columna FECHA fija a la izquierda al deslizar horizontalmente */}
        <td
          className={`sticky left-0 z-10 whitespace-nowrap border-b border-border/50 bg-bg-alt dark:bg-[#0f172a] group-hover:bg-bg-raised dark:group-hover:bg-[#151e36] px-2 py-1.5 ${getLeftAccentBorder(
            draft.paymentMethod
          )}`}
        >
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            disabled={isPending}
            className={`${cellInputClass} w-[106px] font-medium ${dateValid ? "" : "border-red-400"}`}
            title={dateValid ? formatDate(transaction.date) : "Fecha inválida"}
          />
        </td>

        {/* Columna CONCEPTO + BADGE COLORIDO fija a la izquierda al deslizar horizontalmente */}
        <td className="sticky left-[118px] z-10 min-w-[210px] border-b border-r border-border/50 border-r-border bg-bg-alt dark:bg-[#0f172a] group-hover:bg-bg-raised dark:group-hover:bg-[#151e36] px-2.5 py-1.5 shadow-[3px_0_6px_-3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-1.5">
            <MethodColorPill method={draft.paymentMethod} />
            <div className="flex-1 min-w-0">
              <CajaHoverTooltip
                content={draft.description}
                title="Concepto del Movimiento"
                type={transaction.type}
                amount={draft.amount}
                paymentMethod={draft.paymentMethod}
                date={formatDate(transaction.date)}
                notes={transaction.notes}
                minLength={1}
              >
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  disabled={isPending}
                  maxLength={200}
                  className={`${cellInputClass} min-w-[130px] font-semibold text-fg ${
                    descValid ? "" : "border-red-400"
                  }`}
                />
              </CajaHoverTooltip>
            </div>
          </div>
        </td>

        <td className="border-b border-border/50 px-2 py-1.5 text-right font-semibold text-accent">
          {isIncome ? money(draft.amount) : ""}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-right font-medium text-[#742284] dark:text-[#c084fc]">
          {isIncome && draft.paymentMethod === "YAPE 1" ? money(draft.amount) : ""}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-right font-medium text-fuchsia-700 dark:text-fuchsia-300">
          {isIncome && draft.paymentMethod === "YAPE 2" ? money(draft.amount) : ""}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-right font-medium text-emerald-700 dark:text-emerald-400">
          {isIncome && draft.paymentMethod === "EFECTIVO" ? money(draft.amount) : ""}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-right font-semibold text-red-600">
          {!isIncome ? money(draft.amount) : ""}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-right font-medium text-[#742284] dark:text-[#c084fc]">
          {!isIncome && draft.paymentMethod === "YAPE 1" ? money(draft.amount) : ""}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-right font-medium text-fuchsia-700 dark:text-fuchsia-300">
          {!isIncome && draft.paymentMethod === "YAPE 2" ? money(draft.amount) : ""}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-right font-medium text-emerald-700 dark:text-emerald-400">
          {!isIncome && draft.paymentMethod === "EFECTIVO" ? money(draft.amount) : ""}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-right font-bold text-fg">
          {money(running)}
        </td>
        <td className="border-b border-border/50 px-2 py-1.5 text-fg-muted max-w-[130px]">
          {transaction.notes && transaction.notes.trim() ? (
            <CajaHoverTooltip
              content={transaction.notes.trim()}
              title="Nota de Caja"
              date={formatDate(transaction.date)}
              minLength={1}
            >
              <span className="truncate block cursor-help underline decoration-dotted decoration-border/80 hover:decoration-accent hover:text-fg transition-colors">
                {transaction.notes.trim()}
              </span>
            </CajaHoverTooltip>
          ) : (
            <span></span>
          )}
        </td>
        <td className="print:hidden border-b border-border/50 px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            {/* Selector colorido según EFECTIVO / YAPE 1 / YAPE 2 */}
            <select
              value={draft.paymentMethod}
              onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value })}
              disabled={isPending}
              className={`w-[98px] rounded-lg border px-2 py-1 text-[11px] outline-none transition-colors cursor-pointer ${getMethodSelectStyle(
                draft.paymentMethod
              )}`}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m} className="bg-bg text-fg font-semibold">
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
              disabled={isPending}
              className={`${cellInputClass} w-16 border-border text-right font-semibold ${
                amountValid ? "" : "border-red-400"
              }`}
            />
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={isPending || !dirty || !isValid}
              aria-label="Confirmar cambios"
              title={dirty ? "Confirmar cambios" : "Sin cambios"}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
                dirty && isValid
                  ? "animate-pulse bg-accent text-accent-fg hover:animate-none hover:bg-accent-hover"
                  : "text-fg-muted"
              }`}
            >
              <CircleCheck size={14} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={isPending}
              aria-label={`Eliminar ${transaction.description}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 size={13} />
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

        {confirming && (
          <ConfirmDialog
            title="Confirmar cambios del movimiento"
            pending={isPending}
            onConfirm={applyEdit}
            onCancel={() => setConfirming(false)}
            fields={[
              { label: "Fecha", value: draft.date },
              { label: "Descripción", value: draft.description.trim() },
              { label: "Método", value: draft.paymentMethod },
              { label: "Monto", value: `S/. ${draft.amount.toFixed(2)}` },
            ]}
          />
        )}
      </tr>
      {error && (
        <tr className="border-b border-border/50">
          <td colSpan={13} className="px-2 pb-1.5 pt-0 text-[11px] font-semibold text-red-600">
            {error}
          </td>
        </tr>
      )}
    </>
  );
}
