"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import type { AdminService, ClientSummary } from "./actions";
import { PAYMENT_STATUS_LABELS, formatSoles, formatFecha } from "./utils";
import { ServiceDetailModal } from "./ServiceDetailModal";

function statusBadgeClass(status: string): string {
  if (status === "PAGADO") return "bg-accent/10 text-accent";
  if (status === "PARCIAL") return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
}

function iniciales(nombre: string): string {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export function ClientsTab({ clients, onEdit }: { clients: ClientSummary[]; onEdit: (s: AdminService) => void }) {
  const [query, setQuery] = useState("");
  const [openClient, setOpenClient] = useState<ClientSummary | null>(null);
  const [detailService, setDetailService] = useState<AdminService | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => c.clientName.toLowerCase().includes(q));
  }, [clients, query]);

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-fg">Clientes</h2>
      <p className="mt-1 text-sm text-fg-muted">Historial de trabajos por cliente</p>

      <div className="relative mt-4 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente..."
          className="admin-field w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-fg"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 admin-glass rounded-[var(--radius-lg)] py-14 text-center text-fg-muted">No se encontraron clientes.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.clientName}
              type="button"
              onClick={() => setOpenClient(c)}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-bg-alt p-4 text-left transition-shadow hover:shadow-lg hover:shadow-accent/10"
            >
              <h3 className="font-semibold text-fg">{c.clientName}</h3>
              <span className="text-xs text-fg-muted">
                {c.services.length} servicio{c.services.length !== 1 ? "s" : ""} registrado{c.services.length !== 1 ? "s" : ""}
              </span>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-fg-muted">Último: {formatFecha(c.lastServiceDate)}</span>
                {c.pendingCount > 0 ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold uppercase text-red-600">
                    {c.pendingCount} pendiente{c.pendingCount !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 font-bold uppercase text-accent">Al día</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                <span className="text-xs text-fg-muted">Total pagado</span>
                <span className="font-bold text-fg">{formatSoles(c.totalPaid)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {openClient &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6">
            <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-bg-alt p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-sm font-extrabold text-accent">
                    {iniciales(openClient.clientName)}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-fg">{openClient.clientName}</h2>
                    <p className="text-xs text-fg-muted">
                      {openClient.services.length} servicio{openClient.services.length !== 1 ? "s" : ""} en el historial
                    </p>
                  </div>
                </div>
                <button onClick={() => setOpenClient(null)} aria-label="Cerrar" className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-bg">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-bg-raised/60 p-3">
                  <p className="font-display text-lg font-extrabold text-fg">{openClient.services.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-fg-muted">Servicios</p>
                </div>
                <div className="rounded-xl bg-bg-raised/60 p-3">
                  <p className="font-display text-lg font-extrabold text-accent">{formatSoles(openClient.totalPaid)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-fg-muted">Pagado</p>
                </div>
                <div className="rounded-xl bg-bg-raised/60 p-3">
                  <p className="font-display text-lg font-extrabold text-red-600">{formatSoles(openClient.totalPending)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-fg-muted">Pendiente</p>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-fg-muted">Historial de trabajos</h3>
                <div className="mt-2 divide-y divide-border">
                  {openClient.services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setOpenClient(null); setDetailService(s); }}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-bg-raised/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">{s.title}</p>
                        <p className="text-xs text-fg-muted">{s.technicianName}</p>
                      </div>
                      <span className="shrink-0 text-xs text-fg-muted">{formatFecha(s.serviceDate)}</span>
                      <span className="shrink-0 text-sm font-bold text-fg">{formatSoles(s.amount)}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(s.paymentStatus)}`}>
                        {PAYMENT_STATUS_LABELS[s.paymentStatus]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {detailService && (
        <ServiceDetailModal
          service={detailService}
          onClose={() => setDetailService(null)}
          onEdit={() => { onEdit(detailService); setDetailService(null); }}
        />
      )}
    </div>
  );
}
