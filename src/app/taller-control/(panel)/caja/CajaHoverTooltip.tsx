"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileText, Calendar, CreditCard, StickyNote } from "lucide-react";

interface CajaHoverTooltipProps {
  children: ReactNode;
  content: string;
  title?: string;
  type?: "INCOME" | "EXPENSE";
  amount?: number;
  paymentMethod?: string;
  date?: string;
  notes?: string | null;
  /** Solo muestra el tooltip flotante si el texto supera este largo (default: 1) */
  minLength?: number;
  className?: string;
}

export function CajaHoverTooltip({
  children,
  content,
  title = "Concepto del Movimiento",
  type,
  amount,
  paymentMethod,
  date,
  notes,
  minLength = 1,
  className = "",
}: CajaHoverTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanContent = content ? content.trim() : "";
  const shouldEnable = cleanContent.length >= minLength;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 340;
    const placeAbove = rect.top > 150;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Mantener dentro de los bordes visibles de la ventana
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

    const top = placeAbove ? rect.top - 10 : rect.bottom + 10;
    setCoords({ top, left, placeAbove });
  };

  const handleMouseEnter = () => {
    if (!shouldEnable) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Aparición ultra-rápida y fluida (50ms)
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 50);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 60);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-block w-full ${className}`}
    >
      {children}

      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placeAbove ? "translateY(-100%)" : "none",
              zIndex: 9999,
            }}
            /* Tarjeta flotante en BLANCO PURO con esquinas redondeadas perfectas y sombra premium */
            className="pointer-events-none w-[340px] max-w-[92vw] rounded-2xl p-4 shadow-[0_20px_50px_rgba(15,23,42,0.16),0_0_0_1px_rgba(0,0,0,0.06)] animate-in fade-in zoom-in-95 duration-150 transition-all
              bg-white text-slate-900 border border-slate-200/90 ring-1 ring-black/5"
          >
            {/* Cabecera del Tooltip */}
            <div className="flex items-center justify-between border-b pb-2.5 mb-2.5 border-slate-100">
              <div className="flex items-center gap-1.5 font-black text-[11px] uppercase tracking-wider text-blue-600">
                <FileText size={14} className="shrink-0 text-blue-600" />
                <span>{title}</span>
              </div>

              {type && amount !== undefined && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                    type === "INCOME"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {type === "INCOME" ? "Ingreso" : "Gasto"} S/. {amount.toFixed(2)}
                </span>
              )}
            </div>

            {/* Texto Completo Sin Recortes */}
            <div className="text-xs sm:text-sm font-extrabold leading-relaxed break-words text-slate-900">
              {cleanContent}
            </div>

            {/* Metadatos secundarios (método de pago, fecha, notas) */}
            {(paymentMethod || date || notes) && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[10px]">
                {date && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold bg-slate-50 text-slate-700 border border-slate-200/80">
                    <Calendar size={12} className="text-slate-500" />
                    <span>{date}</span>
                  </span>
                )}
                {paymentMethod && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-black bg-blue-50 text-blue-700 border border-blue-200">
                    <CreditCard size={12} className="text-blue-600" />
                    <span>{paymentMethod}</span>
                  </span>
                )}
                {notes && notes.trim() && (
                  <div className="w-full mt-1.5 rounded-xl p-2.5 text-xs leading-relaxed break-words bg-amber-50/70 border border-amber-200 text-amber-900">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 mb-0.5">
                      <StickyNote size={12} />
                      <span>Nota de caja:</span>
                    </div>
                    <span className="font-medium">{notes.trim()}</span>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
