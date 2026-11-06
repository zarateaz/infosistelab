"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Eye, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  deleteService,
  type AdminService,
  type AdminTechnician,
  type AdminEquipmentType,
  type PaymentMethod,
  type PaymentStatus,
  type EquipmentStage,
} from "./actions";
import {
  PAYMENT_METHODS,
  EQUIPMENT_STAGES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  EQUIPMENT_STAGE_LABELS,
  formatSoles,
  formatFecha,
} from "./utils";
import { todayInputValue } from "../caja/month";
import { ConfirmDialog } from "../ConfirmDialog";
import { ServiceForm } from "./ServiceForm";
import { ServiceDetailModal } from "./ServiceDetailModal";
import { PaymentCell, StageCell } from "./ServiceCells";

type ViewMode = "tabla" | "tarjetas";
type Filter = "todos";

function weekStartStr(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

function inDateRange(dayStr: string, range: "todos" | "hoy" | "semana" | "mes"): boolean {
  if (range === "todos") return true;
  const today = todayInputValue();
  if (range === "hoy") return dayStr === today;
  if (range === "mes") return dayStr.slice(0, 7) === today.slice(0, 7);
  return dayStr >= weekStartStr() && dayStr <= today;
}

function statusBadgeClass(status: PaymentStatus): string {
  if (status === "PAGADO") return "bg-accent/10 text-accent";
  if (status === "PARCIAL") return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
}

export function ServicesTab({
  services,
  technicians,
  equipmentTypes,
  editTarget,
  onOpenNew,
  onOpenEdit,
  onCloseForm,
}: {
  services: AdminService[];
  technicians: AdminTechnician[];
  equipmentTypes: AdminEquipmentType[];
  /** Owned by ServiciosApp, not local state — another tab's "Editar" action
   *  (e.g. the dashboard's recent list, or a client's history) needs to
   *  open this tab's form too, and this tab unmounts whenever a different
   *  one is active, so there's nothing here to hand a value off to later. */
  editTarget: AdminService | "new" | null;
  onOpenNew: () => void;
  onOpenEdit: (s: AdminService) => void;
  onCloseForm: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<Filter | PaymentStatus>("todos");
  const [filterPayment, setFilterPayment] = useState<Filter | PaymentMethod>("todos");
  const [filterTechnician, setFilterTechnician] = useState<Filter | string>("todos");
  const [filterStage, setFilterStage] = useState<Filter | EquipmentStage>("todos");
  const [filterEquipmentType, setFilterEquipmentType] = useState<Filter | string>("todos");
  const [filterDate, setFilterDate] = useState<"todos" | "hoy" | "semana" | "mes">("todos");
  const [viewMode, setViewMode] = useState<ViewMode>("tabla");
  const [detailService, setDetailService] = useState<AdminService | null>(null);

  const formOpen = editTarget !== null;
  const editingService = editTarget === "new" ? null : editTarget;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services
      .filter((s) => {
        if (q && !(s.clientName.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || s.technicianName.toLowerCase().includes(q))) return false;
        if (filterStatus !== "todos" && s.paymentStatus !== filterStatus) return false;
        if (filterPayment !== "todos" && s.paymentMethod !== filterPayment) return false;
        if (filterTechnician !== "todos" && s.technicianId !== filterTechnician) return false;
        if (filterStage !== "todos" && s.equipmentStage !== filterStage) return false;
        if (filterEquipmentType !== "todos" && s.equipmentTypeId !== filterEquipmentType) return false;
        if (!inDateRange(s.serviceDate.toISOString().slice(0, 10), filterDate)) return false;
        return true;
      })
      .sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime());
  }, [services, query, filterStatus, filterPayment, filterTechnician, filterStage, filterEquipmentType, filterDate]);

  const openEdit = (s: AdminService) => {
    onOpenEdit(s);
    setDetailService(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-fg">Servicios</h2>
        {!formOpen && (
          <button
            type="button"
            onClick={onOpenNew}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-fg shadow-md shadow-accent/30 transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/40"
          >
            <Plus size={16} strokeWidth={2.5} /> Nuevo servicio
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-4">
          <ServiceForm service={editingService ?? undefined} technicians={technicians} equipmentTypes={equipmentTypes} onDone={onCloseForm} />
        </div>
      )}

      {!formOpen && (
        <>
          <div className="mt-4 flex flex-col gap-3">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por cliente, trabajo o técnico..."
                className="admin-field w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-fg sm:max-w-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="admin-field rounded-lg px-3 py-2 text-xs font-semibold text-fg">
                <option value="todos">Estado: Todos</option>
                <option value="PAGADO">Pagados</option>
                <option value="PARCIAL">Pago parcial</option>
                <option value="PENDIENTE">Pendientes</option>
              </select>
              <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value as typeof filterPayment)} className="admin-field rounded-lg px-3 py-2 text-xs font-semibold text-fg">
                <option value="todos">Forma de pago: Todas</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
              <select value={filterTechnician} onChange={(e) => setFilterTechnician(e.target.value)} className="admin-field rounded-lg px-3 py-2 text-xs font-semibold text-fg">
                <option value="todos">Técnico: Todos</option>
                {technicians.filter((t) => t.isActive).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value as typeof filterStage)} className="admin-field rounded-lg px-3 py-2 text-xs font-semibold text-fg">
                <option value="todos">Etapa: Todas</option>
                {EQUIPMENT_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {EQUIPMENT_STAGE_LABELS[st]}
                  </option>
                ))}
              </select>
              <select value={filterEquipmentType} onChange={(e) => setFilterEquipmentType(e.target.value)} className="admin-field rounded-lg px-3 py-2 text-xs font-semibold text-fg">
                <option value="todos">Tipo de equipo: Todos</option>
                {equipmentTypes.filter((t) => t.isActive).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
              <select value={filterDate} onChange={(e) => setFilterDate(e.target.value as typeof filterDate)} className="admin-field rounded-lg px-3 py-2 text-xs font-semibold text-fg">
                <option value="todos">Fecha: Todas</option>
                <option value="hoy">Hoy</option>
                <option value="semana">Esta semana</option>
                <option value="mes">Este mes</option>
              </select>

              <div className="ml-auto inline-flex items-center gap-1 rounded-xl border-2 border-border-strong bg-bg-alt p-1">
                <button type="button" onClick={() => setViewMode("tabla")} aria-label="Ver como lista" className={`flex h-8 w-9 items-center justify-center rounded-lg transition-colors ${viewMode === "tabla" ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-accent"}`}>
                  <List size={15} />
                </button>
                <button type="button" onClick={() => setViewMode("tarjetas")} aria-label="Ver en cuadros" className={`flex h-8 w-9 items-center justify-center rounded-lg transition-colors ${viewMode === "tarjetas" ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-accent"}`}>
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-fg-muted">
            {filtered.length} de {services.length} servicios
          </p>

          {viewMode === "tabla" ? (
            <ServicesTable services={filtered} onView={setDetailService} onEdit={openEdit} />
          ) : (
            <ServicesGrid services={filtered} onView={setDetailService} onEdit={openEdit} />
          )}
        </>
      )}

      {detailService && (
        <ServiceDetailModal service={detailService} onClose={() => setDetailService(null)} onEdit={() => openEdit(detailService)} />
      )}
    </div>
  );
}

function DeleteButton({ service }: { service: AdminService }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Eliminar servicio de ${service.clientName}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={14} />
      </button>
      {confirming && (
        <ConfirmDialog
          title="Eliminar servicio"
          message={`Se eliminará el registro de "${service.title}" para ${service.clientName}. Esta acción no se puede deshacer.`}
          danger
          pending={isPending}
          onConfirm={() => startTransition(async () => { await deleteService(service.id); setConfirming(false); })}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

// ----------------------------- Vista de tabla ----------------------------- //

function ServicesTable({
  services,
  onView,
  onEdit,
}: {
  services: AdminService[];
  onView: (s: AdminService) => void;
  onEdit: (s: AdminService) => void;
}) {
  return (
    <div className="no-scrollbar mt-3 overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
            <th className="px-4 py-3" />
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Trabajo</th>
            <th className="px-4 py-3">Equipo</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Técnico</th>
            <th className="px-4 py-3">Monto</th>
            <th className="px-4 py-3">Pago</th>
            <th className="px-4 py-3">Estado</th>
            <th className="whitespace-nowrap px-4 py-3">Etapa</th>
            <th className="sticky right-0 z-10 bg-bg-alt px-4 py-3 shadow-[-8px_0_10px_-8px_rgba(15,23,42,0.35)]" />
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0 align-top">
              <td className="px-4 py-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-bg">
                  {s.photos[0] ? <Image src={s.photos[0].path} alt="" fill sizes="40px" className="object-cover" /> : null}
                </div>
              </td>
              <td className="px-4 py-3 font-semibold text-fg">{s.clientName}</td>
              <td className="px-4 py-3 text-fg-muted">{s.title}</td>
              <td className="px-4 py-3 text-fg-muted">{s.equipmentTypeIcon} {s.equipmentTypeName}</td>
              <td className="px-4 py-3 text-fg-muted">{formatFecha(s.serviceDate)}</td>
              <td className="px-4 py-3 text-fg-muted">{s.technicianName}</td>
              <td className="px-4 py-3 font-bold text-fg">{formatSoles(s.amount)}</td>
              <td className="px-4 py-3"><PaymentCell service={s} /></td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(s.paymentStatus)}`}>
                  {PAYMENT_STATUS_LABELS[s.paymentStatus]}
                </span>
              </td>
              <td className="px-4 py-3"><StageCell service={s} /></td>
              <td className="sticky right-0 z-10 bg-bg-alt px-4 py-3 shadow-[-8px_0_10px_-8px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => onView(s)} aria-label="Ver detalle" className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-bg hover:text-accent">
                    <Eye size={14} />
                  </button>
                  <button type="button" onClick={() => onEdit(s)} aria-label="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-bg hover:text-accent">
                    <Pencil size={14} />
                  </button>
                  <DeleteButton service={s} />
                </div>
              </td>
            </tr>
          ))}
          {services.length === 0 && (
            <tr>
              <td colSpan={11} className="px-4 py-14 text-center text-fg-muted">
                No se encontraron servicios con esos criterios.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ----------------------------- Vista de tarjetas ----------------------------- //

function ServicesGrid({
  services,
  onView,
  onEdit,
}: {
  services: AdminService[];
  onView: (s: AdminService) => void;
  onEdit: (s: AdminService) => void;
}) {
  if (services.length === 0) {
    return <p className="mt-3 admin-glass rounded-[var(--radius-lg)] py-14 text-center text-fg-muted">No se encontraron servicios con esos criterios.</p>;
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <div key={s.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-bg-alt">
          <button type="button" onClick={() => onView(s)} className="relative aspect-video w-full bg-bg text-left">
            {s.photos[0] ? <Image src={s.photos[0].path} alt="" fill sizes="33vw" className="object-cover" /> : null}
            <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(s.paymentStatus)}`}>
              {PAYMENT_STATUS_LABELS[s.paymentStatus]}
            </span>
          </button>
          <div className="flex flex-1 flex-col gap-1.5 p-4">
            <button type="button" onClick={() => onView(s)} className="text-left">
              <h3 className="font-semibold text-fg">{s.clientName}</h3>
              <span className="text-xs text-fg-muted">{s.title} · {s.equipmentTypeIcon} {s.equipmentTypeName}</span>
            </button>
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>{s.technicianName} · {formatFecha(s.serviceDate)}</span>
              <span className="font-bold text-fg">{formatSoles(s.amount)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <PaymentCell service={s} />
              <StageCell service={s} />
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-fg-muted">📞 {s.clientPhone}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onEdit(s)} aria-label="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-bg hover:text-accent">
                  <Pencil size={14} />
                </button>
                <DeleteButton service={s} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
