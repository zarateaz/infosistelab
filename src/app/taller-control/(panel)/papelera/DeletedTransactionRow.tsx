"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { restoreTransaction, permanentlyDeleteTransaction, type DeletedTransaction } from "../caja/actions";
import { dateToInputValue } from "../caja/month";
import { ConfirmDialog } from "../ConfirmDialog";

const fmtDeletedAt = (d: Date) => new Date(d).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });

export function DeletedTransactionRow({ transaction }: { transaction: DeletedTransaction }) {
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [isPending, startTransition] = useTransition();

  const restore = () => startTransition(() => restoreTransaction(transaction.id));
  const purge = () => startTransition(async () => {
    await permanentlyDeleteTransaction(transaction.id);
    setConfirmingPurge(false);
  });

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3.5">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            transaction.type === "INCOME" ? "bg-accent/10 text-accent" : "bg-red-50 text-red-600"
          }`}
        >
          {transaction.type === "INCOME" ? "Ingreso" : "Gasto"}
        </span>
      </td>
      <td className="px-5 py-3.5 font-semibold text-fg">{transaction.description}</td>
      <td className={`px-5 py-3.5 font-bold ${transaction.type === "INCOME" ? "text-accent" : "text-red-600"}`}>
        S/. {transaction.amount.toFixed(2)}
      </td>
      <td className="px-5 py-3.5 text-fg-muted">{dateToInputValue(new Date(transaction.date))}</td>
      <td className="px-5 py-3.5 text-fg-muted">{fmtDeletedAt(transaction.deletedAt)}</td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={restore}
            disabled={isPending}
            aria-label={`Restaurar movimiento ${transaction.description}`}
            title="Restaurar"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <RotateCcw size={13} /> Restaurar
          </button>
          <button
            type="button"
            onClick={() => setConfirmingPurge(true)}
            disabled={isPending}
            aria-label={`Eliminar definitivamente el movimiento ${transaction.description}`}
            title="Eliminar definitivamente"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>

      {confirmingPurge && (
        <ConfirmDialog
          title="Eliminar definitivamente"
          message={`¿Eliminar para siempre el movimiento "${transaction.description}"? Esta vez no hay Papelera que lo recupere.`}
          danger
          confirmLabel="Eliminar para siempre"
          pending={isPending}
          onConfirm={purge}
          onCancel={() => setConfirmingPurge(false)}
        />
      )}
    </tr>
  );
}
