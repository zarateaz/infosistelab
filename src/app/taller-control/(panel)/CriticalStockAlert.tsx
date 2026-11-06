"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  buildWhatsAppLink,
  generateStockReportMessage,
  type LowStockProductItem,
} from "@/lib/whatsappStockReport";

export function CriticalStockAlert({
  products,
}: {
  products: LowStockProductItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  const critical = products.filter((p) => p.stock === 1);
  const outOfStock = products.filter((p) => p.stock === 0);
  const low = products.filter((p) => p.stock > 1 && p.stock <= 3);

  const totalAlerts = products.length;
  if (totalAlerts === 0) return null;

  const handleSendWhatsApp = () => {
    const message = generateStockReportMessage(products);
    window.open(buildWhatsAppLink(message), "_blank");
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/30 via-amber-950/20 to-bg-alt shadow-lg backdrop-blur-md">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-500 ring-4 ring-red-500/10 animate-pulse">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Alerta de Stock
              </span>
              {critical.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  {critical.length} con 1 unidad
                </span>
              )}
            </div>
            <h3 className="mt-1 text-base font-bold text-fg">
              {critical.length > 0
                ? `¡Atención! Hay ${critical.length} producto(s) en stock crítico (1 unidad restante)`
                : `Hay ${totalAlerts} producto(s) con stock bajo o agotado`}
            </h3>
            <p className="text-xs text-fg-muted">
              {outOfStock.length} agotado(s) · {critical.length} con 1 unidad · {low.length} con stock bajo (2-3)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-95"
            title="Enviar reporte detallado al WhatsApp de la empresa"
          >
            <MessageCircle size={15} />
            <span>Mandar reporte a WhatsApp</span>
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg/60 px-3 py-2.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg"
          >
            <span>{expanded ? "Ocultar lista" : "Ver productos"}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60 bg-bg/40 px-5 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const isCrit = p.stock === 1;
              const isOut = p.stock === 0;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl border p-3 ${
                    isCrit
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : isOut
                        ? "border-red-500/40 bg-red-500/10 text-red-300"
                        : "border-border bg-bg/50 text-fg"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-xs font-bold text-fg">{p.name}</p>
                    <p className="text-[10px] text-fg-muted">{p.category}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-black ${
                        isCrit
                          ? "bg-amber-500 text-white"
                          : isOut
                            ? "bg-red-600 text-white"
                            : "bg-fg/10 text-fg"
                      }`}
                    >
                      {p.stock === 0 ? "0 u. (Agotado)" : `${p.stock} u. disp.`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <Link
              href="/taller-control/inventario"
              className="text-xs font-bold text-accent hover:underline"
            >
              Ir a Inventario completo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
