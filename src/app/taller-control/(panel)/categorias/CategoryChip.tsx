"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { renameCategory, deleteCategory } from "./actions";
import { ConfirmDialog } from "../ConfirmDialog";

export function CategoryChip({ id, name }: { id: string; name: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    if (value.trim() === name) {
      setIsEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await renameCategory(id, value);
      if (result.error) {
        setError(result.error);
        setValue(name);
      } else {
        setError(null);
      }
      setIsEditing(false);
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteCategory(id);
      setConfirmingDelete(false);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-4 py-2.5">
        {isEditing ? (
          <input
            autoFocus
            value={value}
            disabled={isPending}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            onBlur={save}
            className="w-32 rounded-lg border border-accent bg-bg-alt px-2 py-1 text-sm font-bold uppercase text-fg outline-none"
          />
        ) : (
          <span className="text-sm font-bold text-fg">{name}</span>
        )}

        <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          {isEditing ? (
            <button onClick={save} className="text-accent" aria-label="Guardar">
              <Check size={14} />
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="text-fg-muted hover:text-accent" aria-label={`Editar ${name}`}>
              <Pencil size={13} />
            </button>
          )}
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-fg-muted hover:text-red-600"
            aria-label={`Eliminar ${name}`}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={`¿Eliminar la categoría "${name}"?`}
          danger
          pending={isPending}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
