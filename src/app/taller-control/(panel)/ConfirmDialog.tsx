"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  /** Plain prose confirmation — used for destructive actions (delete). */
  message?: string;
  /** Structured before/after summary — used for edit confirmations. */
  fields?: { label: string; value: string }[];
  confirmLabel?: string;
  pendingLabel?: string;
  /** Red, destructive styling (delete) instead of the default accent blue
   *  (confirm an edit) — the same red the rest of the admin panel already
   *  uses on delete buttons' hover state. */
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Shared admin-panel confirmation modal — replaces the native
 *  `window.confirm()` popup (a plain OS dialog that read "infosistel.com.pe
 *  dice...", clashing with the rest of the panel) everywhere it was used:
 *  every edit-confirmation and every delete across Caja, Cuentas,
 *  Servicios, Productos, Reparaciones, Usuarios, Ventas, Categorías.
 *
 *  Portals to document.body: callers render inside an .admin-glass card or
 *  table wrapper, whose backdrop-filter creates a new containing block for
 *  `fixed` descendants — without the portal the overlay would be clipped
 *  to that wrapper instead of covering the viewport (see SellButton.tsx). */
export function ConfirmDialog({
  title,
  message,
  fields,
  confirmLabel,
  pendingLabel,
  danger = false,
  pending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-bg-alt p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {danger && <AlertTriangle size={16} className="shrink-0 text-red-600" />}
            <h3 className="text-sm font-bold text-fg">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={pending}
            aria-label="Cancelar"
            className="shrink-0 rounded-full p-1.5 text-fg-muted transition-colors hover:bg-bg disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {message && <p className="mt-3 text-sm text-fg-muted">{message}</p>}

        {fields && fields.length > 0 && (
          <dl className="mt-4 space-y-2 text-sm">
            {fields.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-fg-muted">{f.label}</dt>
                <dd className="text-right font-semibold text-fg">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={pending}
            className="text-xs font-semibold text-fg-muted hover:text-fg disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 ${
              danger ? "bg-red-600 text-white" : "bg-accent text-accent-fg"
            }`}
          >
            {danger ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
            {pending ? (pendingLabel ?? (danger ? "Eliminando..." : "Guardando...")) : (confirmLabel ?? (danger ? "Eliminar" : "Aceptar"))}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
