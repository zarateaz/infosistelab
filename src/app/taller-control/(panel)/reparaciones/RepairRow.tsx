"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { updateRepairProgress, deleteRepair } from "./actions";
import type { AdminRepair } from "./actions";
import { ConfirmDialog } from "../ConfirmDialog";

export function RepairRow({ repair }: { repair: AdminRepair }) {
  const [progress, setProgress] = useState(repair.progress);
  const [statusText, setStatusText] = useState(repair.statusText);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(() => updateRepairProgress(repair.id, progress, statusText));
  };

  const remove = () => {
    startTransition(async () => {
      await deleteRepair(repair.id);
      setConfirmingDelete(false);
    });
  };

  return (
    <div className="admin-glass rounded-[var(--radius-lg)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-sm font-bold text-accent">{repair.code}</p>
          <p className="mt-1 font-semibold text-fg">{repair.equipment}</p>
          <p className="text-sm text-fg-muted">DNI: {repair.dni}</p>
          <p className="mt-2 max-w-md text-sm text-fg-muted">{repair.problem}</p>
        </div>
        <button
          onClick={() => setConfirmingDelete(true)}
          aria-label={`Eliminar ${repair.code}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar reparación"
          message={`¿Eliminar la reparación ${repair.code}? Esta acción no se puede deshacer.`}
          danger
          pending={isPending}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <input
          type="text"
          value={statusText}
          onChange={(e) => setStatusText(e.target.value)}
          onBlur={save}
          className="w-40 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm font-semibold text-fg outline-none focus:border-accent"
        />
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          onMouseUp={save}
          onTouchEnd={save}
          className="h-2 flex-1 accent-accent"
        />
        <span className="w-12 text-right text-sm font-bold text-fg">{progress}%</span>
        {isPending && <span className="text-xs text-fg-muted">Guardando...</span>}
      </div>
    </div>
  );
}
