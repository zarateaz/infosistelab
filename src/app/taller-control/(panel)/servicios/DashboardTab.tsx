"use client";

import { useState } from "react";
import Image from "next/image";
import { ClipboardList, DollarSign, Clock, Plus, UserCheck } from "lucide-react";
import type { AdminService, ServiceDashboard } from "./actions";
import { PAYMENT_STATUS_LABELS, formatSoles, formatFecha } from "./utils";
import { StatCard } from "../StatCard";
import { ServiceDetailModal } from "./ServiceDetailModal";

function statusBadgeClass(status: string): string {
  if (status === "PAGADO") return "bg-accent/10 text-accent";
  if (status === "PARCIAL") return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
}

export function DashboardTab({
  dashboard,
  onEdit,
  onNewService,
}: {
  dashboard: ServiceDashboard;
  onEdit: (s: AdminService) => void;
  onNewService: () => void;
}) {
  const [detailService, setDetailService] = useState<AdminService | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-fg">Resumen</h2>
          <p className="mt-1 text-sm text-fg-muted">Resumen general de los servicios técnicos</p>
        </div>
        <button
          type="button"
          onClick={onNewService}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-fg shadow-md shadow-accent/30 transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/40"
        >
          <Plus size={16} strokeWidth={2.5} /> Nuevo servicio
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={ClipboardList} label="Total de servicios" value={dashboard.total} sub="registrados en el sistema" tint="blue" />
        <StatCard icon={UserCheck} label="Servicios pagados" value={dashboard.paidCount} sub="trabajos ya cobrados" tint="emerald" />
        <StatCard icon={Clock} label="Pendientes de pago" value={dashboard.pendingCount} sub="trabajos por cobrar" tint="amber" />
        <StatCard icon={DollarSign} label="Total cobrado" value={formatSoles(dashboard.totalCollected)} sub="ingresos confirmados" tint="cyan" />
        <StatCard icon={DollarSign} label="Total pendiente" value={formatSoles(dashboard.totalPending)} sub="por cobrar a clientes" tint="red" />
        <StatCard icon={UserCheck} label="Técnicos activos" value={dashboard.activeTechnicians} sub="disponibles ahora" tint="violet" />
      </div>

      <div className="mt-6 admin-glass rounded-[var(--radius-lg)] p-6">
        <h3 className="font-display text-sm font-bold text-fg">Últimos servicios registrados</h3>
        {dashboard.recent.length === 0 ? (
          <p className="mt-4 text-sm text-fg-muted">Aún no hay servicios registrados. Crea el primero desde &quot;Servicios&quot;.</p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {dashboard.recent.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setDetailService(s)}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-bg-raised/60"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-bg">
                  {s.photos[0] && <Image src={s.photos[0].path} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{s.clientName}</p>
                  <p className="truncate text-xs text-fg-muted">{s.title}</p>
                </div>
                <span className="hidden shrink-0 text-xs text-fg-muted sm:block">{s.technicianName}</span>
                <span className="hidden shrink-0 text-xs text-fg-muted sm:block">{formatFecha(s.serviceDate)}</span>
                <span className="shrink-0 text-sm font-bold text-fg">{formatSoles(s.amount)}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(s.paymentStatus)}`}>
                  {PAYMENT_STATUS_LABELS[s.paymentStatus]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
