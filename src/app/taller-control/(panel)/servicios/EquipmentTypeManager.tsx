"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Plus, Wrench, X } from "lucide-react";
import {
  createEquipmentType,
  toggleEquipmentTypeStatus,
  updateEquipmentType,
  type AdminEquipmentType,
  type EquipmentTypeFormState,
} from "./actions";

const initialState: EquipmentTypeFormState = {};
const inputClass = "admin-field w-full rounded-lg px-3 py-2 text-sm text-fg";

export function EquipmentTypeManager({ types }: { types: AdminEquipmentType[] }) {
  return (
    <div className="admin-glass rounded-[var(--radius-lg)] p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-fg">
        <Wrench size={18} className="text-accent" /> Tipos de equipo
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
          {types.filter((t) => t.isActive).length} activos
        </span>
      </h2>
      <p className="mt-1 text-xs text-fg-muted">
        Estos son los tipos que aparecen al registrar un servicio. Agrega más si trabajas con otros equipos.
      </p>

      <div className="mt-5 space-y-4">
        <AddEquipmentTypeForm />
        <div className="space-y-2">
          {types.map((t) => (
            <EquipmentTypeRow key={t.id} type={t} />
          ))}
          {types.length === 0 && (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-fg-muted">
              Todavía no hay tipos de equipo registrados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddEquipmentTypeForm() {
  const [state, formAction, isPending] = useActionState(createEquipmentType, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error && !isPending) formRef.current?.reset();
  }, [state, isPending]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-2 rounded-xl bg-bg-raised/60 p-4 sm:grid-cols-[80px_1fr_auto]">
      <input name="icon" type="text" placeholder="🔧" maxLength={4} defaultValue="🔧" className={`${inputClass} text-center text-lg`} />
      <input name="name" type="text" placeholder="Ej. Tablet" required maxLength={60} className={inputClass} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Plus size={14} /> {isPending ? "Agregando..." : "Agregar tipo"}
      </button>
      {state.error && <p className="sm:col-span-3 text-xs font-medium text-red-600">{state.error}</p>}
    </form>
  );
}

function EquipmentTypeRow({ type }: { type: AdminEquipmentType }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [icon, setIcon] = useState(type.icon);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(() => updateEquipmentType(type.id, { name, icon }));
    setEditing(false);
  };

  const toggle = () => startTransition(() => toggleEquipmentTypeStatus(type.id));

  if (editing) {
    return (
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-accent/40 bg-bg-raised/60 p-3 sm:grid-cols-[80px_1fr_auto_auto]">
        <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className={`${inputClass} text-center text-lg`} />
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <button type="button" onClick={save} className="rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-accent-fg hover:opacity-90">
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-border-strong px-4 py-1.5 text-xs font-bold text-fg-muted hover:text-fg"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg-raised/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xl">{type.icon}</span>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            {type.name}
            {!type.isActive && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">Inactivo</span>
            )}
          </p>
          <p className="text-xs text-fg-muted">
            {type.serviceCount} servicio{type.serviceCount === 1 ? "" : "s"} registrado{type.serviceCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${type.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-bg hover:text-accent"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
            type.isActive ? "text-fg-muted hover:bg-red-50 hover:text-red-600" : "text-accent hover:bg-accent/10"
          }`}
        >
          {type.isActive ? (
            <span className="inline-flex items-center gap-1">
              <X size={12} /> Desactivar
            </span>
          ) : (
            "Activar"
          )}
        </button>
      </div>
    </div>
  );
}
