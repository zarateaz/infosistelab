"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { restoreSale, permanentlyDeleteSale, type DeletedSale } from "../ventas/actions";
import { ConfirmDialog } from "../ConfirmDialog";

const fmtDate = (d: Date) => new Date(d).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });

export function DeletedSaleRow({ sale }: { sale: DeletedSale }) {
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [isPending, startTransition] = useTransition();

  const restore = () => startTransition(() => restoreSale(sale.id));
  const purge = () => startTransition(async () => {
    await permanentlyDeleteSale(sale.id);
    setConfirmingPurge(false);
  });

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3.5">
        <p className="font-semibold text-fg">{sale.pName}</p>
        {sale.category && <p className="text-xs text-fg-muted">{sale.category}</p>}
      </td>
      <td className="px-5 py-3.5 text-fg">x{sale.quantity}</td>
      <td className="px-5 py-3.5 text-fg">S/. {sale.price.toFixed(2)}</td>
      <td className="px-5 py-3.5 text-fg-muted">{fmtDate(sale.date)}</td>
      <td className="px-5 py-3.5 text-fg-muted">{fmtDate(sale.deletedAt)}</td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={restore}
            disabled={isPending}
            aria-label={`Restaurar venta de ${sale.pName}`}
            title="Restaurar"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <RotateCcw size={13} /> Restaurar
          </button>
          <button
            type="button"
            onClick={() => setConfirmingPurge(true)}
            disabled={isPending}
            aria-label={`Eliminar definitivamente la venta de ${sale.pName}`}
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
          message={`¿Eliminar para siempre la venta de "${sale.pName}"? Esta vez no hay Papelera que la recupere.`}
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
