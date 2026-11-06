"use client";

import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { setCashboxPeriodResponsible, type AdminCashboxPeriod } from "./actions";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function openingDateLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  return `01/${String(monthNum).padStart(2, "0")}/${year}`;
}

/** "Fecha de apertura" + "Responsable" strip at the top of a month's cash
 *  box — same two fields the spreadsheet had. The opening date is always
 *  the 1st of the month (derived, never stored); the responsible person is
 *  the one thing actually worth persisting per month, so it's editable
 *  inline instead of needing a whole settings page for one text field. */
export function PeriodHeader({ month, period }: { month: string; period: AdminCashboxPeriod | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(period?.responsible ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setCashboxPeriodResponsible(month, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  return (
    <div className="admin-glass flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[var(--radius-lg)] p-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Fecha de apertura</p>
        <p className="mt-0.5 text-sm font-bold text-fg">{openingDateLabel(month)}</p>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">Responsable</p>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              autoFocus
              placeholder="Nombre del responsable"
              className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending || value.trim().length === 0}
              aria-label="Guardar responsable"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg transition-opacity disabled:opacity-50"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold text-fg transition-colors hover:text-accent"
          >
            {period?.responsible ?? <span className="font-normal text-fg-muted">Sin asignar — clic para agregar</span>}
            <Pencil size={12} className="text-fg-muted" />
          </button>
        )}
        {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
