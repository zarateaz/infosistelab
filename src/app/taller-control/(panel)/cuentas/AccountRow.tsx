"use client";

import { useState, useTransition } from "react";
import { Trash2, CircleCheck, Pencil, X } from "lucide-react";
import {
  registerCollection,
  registerPayment,
  deleteReceivable,
  deletePayable,
  updateReceivable,
  updatePayable,
  type AccountRow as Row,
  type AccountPatch,
} from "./actions";
import { PAYMENT_METHODS, DOCUMENT_TYPES, STATUS_STYLES } from "./constants";
import { ConfirmDialog } from "../ConfirmDialog";
import { AutoGrowInput } from "../AutoGrowInput";

// timeZone: "UTC" pins this to the calendar day the date represents,
// regardless of which machine renders it — issueDate/dueDate come from
// z.coerce.date() on a plain "YYYY-MM-DD" (UTC midnight per spec), and this
// app's dev box (Lima) isn't the same time zone as the VPS it deploys to.
// Reading with the browser/server's local time zone here would show the
// wrong day exactly like the Caja date bug this mirrors.
const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
const fmtMoney = (n: number) => `S/. ${n.toFixed(2)}`;
const toInputDate = (d: Date) => new Date(d).toISOString().slice(0, 10);

const fieldClass = "admin-field mt-1 w-full rounded-lg px-3 py-1.5 text-sm text-fg";
const fieldLabel = "text-[10px] font-bold uppercase tracking-wider text-fg-muted";

export function AccountRow({ row, kind }: { row: Row; kind: "cobrar" | "pagar" }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(row.saldo > 0 ? row.saldo : 0);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [draft, setDraft] = useState<AccountPatch>({
    party: row.party,
    ruc: row.ruc,
    documentType: row.documentType,
    concept: row.concept,
    total: row.total,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    settled: row.settled,
    paymentMethod: row.paymentMethod,
    notes: row.notes,
  });

  const settle = () => {
    if (amount <= 0) return;
    startTransition(async () => {
      const registerFn = kind === "cobrar" ? registerCollection : registerPayment;
      await registerFn(row.id, { amount, paymentMethod: method as (typeof PAYMENT_METHODS)[number] });
      setOpen(false);
    });
  };

  const startEdit = () => {
    setDraft({
      party: row.party,
      ruc: row.ruc,
      documentType: row.documentType,
      concept: row.concept,
      total: row.total,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      settled: row.settled,
      paymentMethod: row.paymentMethod,
      notes: row.notes,
    });
    setError(null);
    setOpen(false);
    setEditing(true);
  };

  const saveEdit = () => {
    startTransition(async () => {
      const updateFn = kind === "cobrar" ? updateReceivable : updatePayable;
      const result = await updateFn(row.id, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  };

  const remove = () => {
    startTransition(async () => {
      await (kind === "cobrar" ? deleteReceivable(row.id) : deletePayable(row.id));
      setConfirmingDelete(false);
    });
  };

  return (
    <>
      <tr className="border-b border-border last:border-0 align-top">
        <td className="px-4 py-2.5 text-fg-muted">{fmtDate(row.issueDate)}</td>
        <td className="px-4 py-2.5">
          <p className="font-semibold text-fg">{row.party}</p>
          {row.ruc && <p className="text-[11px] text-fg-muted">RUC {row.ruc}</p>}
        </td>
        <td className="px-4 py-2.5 text-fg-muted">
          {row.documentType ?? "—"}
          <p className="max-w-[220px] truncate text-[11px] text-fg-muted/80" title={row.concept}>
            {row.concept}
          </p>
        </td>
        <td className="px-4 py-2.5 font-semibold text-fg">{fmtMoney(row.total)}</td>
        <td className="px-4 py-2.5 font-bold">
          <span className={row.saldo > 0 ? "text-fg" : "text-accent"}>{fmtMoney(row.saldo)}</span>
        </td>
        <td className="px-4 py-2.5 text-fg-muted">{fmtDate(row.dueDate)}</td>
        <td className="px-4 py-2.5">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[row.status]}`}>
            {row.status}
            {row.status === "VENCIDO" && ` · ${row.overdueDays}d`}
          </span>
        </td>
        <td className="px-4 py-2.5 text-fg-muted">{row.paymentMethod ?? "—"}</td>
        <td className="px-4 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            {row.saldo > 0 && (
              <button
                onClick={() => {
                  setEditing(false);
                  setOpen((v) => !v);
                }}
                disabled={isPending}
                aria-label={`Registrar ${kind === "cobrar" ? "cobro" : "pago"} de ${row.party}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-accent/10 hover:text-accent disabled:opacity-40"
              >
                <CircleCheck size={15} />
              </button>
            )}
            <button
              onClick={editing ? () => setEditing(false) : startEdit}
              disabled={isPending}
              aria-label={`Editar ${row.party}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-accent/10 hover:text-accent disabled:opacity-40"
            >
              {editing ? <X size={15} /> : <Pencil size={15} />}
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={isPending}
              aria-label={`Eliminar ${row.party}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      </tr>

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar cuenta"
          message={`¿Eliminar por completo la cuenta de "${row.party}"? Esta acción no se puede deshacer.`}
          danger
          pending={isPending}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {open && (
        <tr className="border-b border-border bg-bg-raised/50">
          <td colSpan={9} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                  Monto {kind === "cobrar" ? "cobrado" : "pagado"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={row.saldo}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className={`${fieldClass} w-32`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Medio</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={fieldClass}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={settle}
                disabled={isPending || amount <= 0}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Confirmar"}
              </button>
              <button onClick={() => setOpen(false)} className="text-xs font-semibold text-fg-muted hover:text-fg">
                Cancelar
              </button>
            </div>
          </td>
        </tr>
      )}

      {editing && (
        <tr className="border-b border-border bg-bg-raised/50">
          <td colSpan={9} className="px-4 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fg-muted">
              Editar cuenta — {kind === "cobrar" ? "cliente" : "proveedor"}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={fieldLabel}>{kind === "cobrar" ? "Cliente" : "Proveedor"}</label>
                <input
                  value={draft.party}
                  onChange={(e) => setDraft({ ...draft, party: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>RUC</label>
                <input
                  value={draft.ruc ?? ""}
                  onChange={(e) => setDraft({ ...draft, ruc: e.target.value || null })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>Documento</label>
                <select
                  value={draft.documentType ?? ""}
                  onChange={(e) => setDraft({ ...draft, documentType: e.target.value || null })}
                  className={fieldClass}
                >
                  <option value="">Sin comprobante</option>
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Concepto</label>
                <AutoGrowInput
                  value={draft.concept}
                  onChange={(e) => setDraft({ ...draft, concept: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>Fecha de emisión</label>
                <input
                  type="date"
                  value={toInputDate(draft.issueDate)}
                  onChange={(e) => setDraft({ ...draft, issueDate: new Date(e.target.value) })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>Vencimiento</label>
                <input
                  type="date"
                  value={toInputDate(draft.dueDate)}
                  onChange={(e) => setDraft({ ...draft, dueDate: new Date(e.target.value) })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>Total (S/.)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  value={draft.total}
                  onChange={(e) => setDraft({ ...draft, total: Number(e.target.value) })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>{kind === "cobrar" ? "Cobrado" : "Pagado"} (S/.)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={draft.settled}
                  onChange={(e) => setDraft({ ...draft, settled: Number(e.target.value) })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>Medio de {kind === "cobrar" ? "cobro" : "pago"}</label>
                <select
                  value={draft.paymentMethod ?? ""}
                  onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value || null })}
                  className={fieldClass}
                >
                  <option value="">Sin definir</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={fieldLabel}>Observaciones</label>
                <AutoGrowInput
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
                  className={fieldClass}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={saveEdit}
                disabled={isPending}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Guardar cambios"}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs font-semibold text-fg-muted hover:text-fg">
                Cancelar
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
