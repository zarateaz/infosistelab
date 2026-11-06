"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, Users, X } from "lucide-react";
import {
  createTechnician,
  deleteTechnician,
  toggleTechnicianStatus,
  updateTechnician,
  type AdminTechnician,
  type TechnicianFormState,
} from "./actions";
import { ConfirmDialog } from "../ConfirmDialog";

const initialState: TechnicianFormState = {};
const inputClass = "admin-field w-full rounded-lg px-3 py-2 text-sm text-fg";

export function TechnicianManager({ technicians }: { technicians: AdminTechnician[] }) {
  // Defaults open: this now lives on its own "Configuración" tab (not a
  // collapsible sidebar widget next to the service form anymore), so
  // there's no space to save by starting collapsed.
  const [open, setOpen] = useState(true);

  return (
    <div className="admin-glass rounded-[var(--radius-lg)] p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-fg">
          <Users size={18} className="text-accent" /> Técnicos
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
            {technicians.filter((t) => t.isActive).length} activos
          </span>
        </h2>
        <span className="text-xs font-bold uppercase tracking-wide text-accent">{open ? "Ocultar" : "Gestionar"}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-4">
          <AddTechnicianForm />
          <div className="space-y-2">
            {technicians.map((t) => (
              <TechnicianRow key={t.id} technician={t} />
            ))}
            {technicians.length === 0 && (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-fg-muted">
                Todavía no hay técnicos registrados.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddTechnicianForm() {
  const [state, formAction, isPending] = useActionState(createTechnician, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error && !isPending) formRef.current?.reset();
  }, [state, isPending]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-2 rounded-xl bg-bg-raised/60 p-4 sm:grid-cols-4">
      <input name="name" type="text" placeholder="Nombre" required maxLength={100} className={`${inputClass} sm:col-span-2`} />
      <input name="phone" type="text" placeholder="Celular (opcional)" maxLength={20} className={inputClass} />
      <input name="specialty" type="text" placeholder="Especialidad (opcional)" maxLength={100} className={inputClass} />
      {state.error && <p className="sm:col-span-4 text-xs font-medium text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60 sm:col-span-4 sm:w-fit"
      >
        <Plus size={14} /> {isPending ? "Agregando..." : "Agregar técnico"}
      </button>
    </form>
  );
}

function TechnicianRow({ technician }: { technician: AdminTechnician }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(technician.name);
  const [phone, setPhone] = useState(technician.phone ?? "");
  const [specialty, setSpecialty] = useState(technician.specialty ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(() => updateTechnician(technician.id, { name, phone, specialty }));
    setEditing(false);
  };

  const toggle = () => startTransition(() => toggleTechnicianStatus(technician.id));

  const remove = () => {
    startTransition(async () => {
      const result = await deleteTechnician(technician.id);
      setConfirmingDelete(false);
      if (result.error) setDeleteError(result.error);
    });
  };

  if (editing) {
    return (
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-accent/40 bg-bg-raised/60 p-3 sm:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} sm:col-span-2`} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Celular" className={inputClass} />
        <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Especialidad" className={inputClass} />
        <div className="flex gap-2 sm:col-span-4">
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-accent-fg hover:opacity-90"
          >
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
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg-raised/60 px-4 py-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
          {technician.name}
          {!technician.isActive && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">Inactivo</span>
          )}
        </p>
        <p className="text-xs text-fg-muted">
          {[technician.specialty, technician.phone].filter(Boolean).join(" · ") || "Sin datos adicionales"} ·{" "}
          {technician.serviceCount} servicio{technician.serviceCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${technician.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-bg hover:text-accent"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
            technician.isActive
              ? "text-fg-muted hover:bg-red-50 hover:text-red-600"
              : "text-accent hover:bg-accent/10"
          }`}
        >
          {technician.isActive ? <span className="inline-flex items-center gap-1"><X size={12} /> Desactivar</span> : "Activar"}
        </button>
        {technician.serviceCount === 0 && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={isPending}
            aria-label={`Eliminar ${technician.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {deleteError && <p className="mt-1 w-full text-xs font-medium text-red-600">{deleteError}</p>}

      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar técnico"
          message={`¿Eliminar a "${technician.name}" de la lista de técnicos? Esta acción no se puede deshacer.`}
          danger
          pending={isPending}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
