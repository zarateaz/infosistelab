"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Contenedor de modal blanco puro (mismo lenguaje visual que el modal de
 *  edición de Cobranza de Internet): portal al body, Esc para cerrar y clic
 *  fuera para cerrar salvo que haya una operación en curso. */
export function ModalShell({
  title,
  subtitle,
  icon,
  iconClass = "from-blue-600 to-indigo-600 shadow-blue-500/25",
  onClose,
  busy = false,
  maxWidth = "max-w-2xl",
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconClass?: string;
  onClose: () => void;
  busy?: boolean;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, busy]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[94vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl bg-white text-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-slate-200/90 animate-in zoom-in-95 duration-150 sm:rounded-3xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${iconClass}`}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold tracking-tight text-slate-900">{title}</h3>
              {subtitle && <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            title="Cerrar"
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export const modalLabel = "mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700";
export const modalInput =
  "w-full rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100";
