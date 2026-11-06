"use client";

import { useState } from "react";
import { LayoutDashboard, ClipboardList, Images, Clock, Users, Settings } from "lucide-react";
import type { AdminService, AdminTechnician, AdminEquipmentType, ClientSummary, ServiceDashboard } from "./actions";
import { DashboardTab } from "./DashboardTab";
import { ServicesTab } from "./ServicesTab";
import { PendingTab } from "./PendingTab";
import { ClientsTab } from "./ClientsTab";
import { GalleryTab } from "./GalleryTab";
import { ConfigTab } from "./ConfigTab";

type Tab = "dashboard" | "servicios" | "galeria" | "pendientes" | "clientes" | "configuracion";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "servicios", label: "Servicios", icon: ClipboardList },
  { id: "galeria", label: "Galería", icon: Images },
  { id: "pendientes", label: "Pendientes de cobro", icon: Clock },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

export function ServiciosApp({
  dashboard,
  services,
  pendingServices,
  galleryServices,
  clients,
  technicians,
  equipmentTypes,
}: {
  dashboard: ServiceDashboard;
  services: AdminService[];
  pendingServices: AdminService[];
  galleryServices: AdminService[];
  clients: ClientSummary[];
  technicians: AdminTechnician[];
  equipmentTypes: AdminEquipmentType[];
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [editTarget, setEditTarget] = useState<AdminService | "new" | null>(null);

  const editFromElsewhere = (s: AdminService) => {
    setEditTarget(s);
    setTab("servicios");
  };

  const newServiceFromElsewhere = () => {
    setEditTarget("new");
    setTab("servicios");
  };

  const pendingCount = dashboard.pendingCount;

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              // Plain tab navigation always clears any pending edit target —
              // otherwise leaving "Servicios" mid-edit and coming back later
              // via the tab button (not through editFromElsewhere) would
              // reopen the same stale form on remount.
              setEditTarget(null);
              setTab(id);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${
              tab === id ? "bg-accent text-accent-fg shadow-sm shadow-accent/30" : "text-fg-muted hover:bg-bg-raised hover:text-fg"
            }`}
          >
            <Icon size={15} />
            {label}
            {id === "pendientes" && pendingCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === id ? "bg-white/20" : "bg-red-600 text-white"}`}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "dashboard" && <DashboardTab dashboard={dashboard} onEdit={editFromElsewhere} onNewService={newServiceFromElsewhere} />}
        {tab === "servicios" && (
          <ServicesTab
            services={services}
            technicians={technicians}
            equipmentTypes={equipmentTypes}
            editTarget={editTarget}
            onOpenNew={() => setEditTarget("new")}
            onOpenEdit={(s) => setEditTarget(s)}
            onCloseForm={() => setEditTarget(null)}
          />
        )}
        {tab === "galeria" && <GalleryTab services={galleryServices} />}
        {tab === "pendientes" && <PendingTab services={pendingServices} onEdit={editFromElsewhere} />}
        {tab === "clientes" && <ClientsTab clients={clients} onEdit={editFromElsewhere} />}
        {tab === "configuracion" && <ConfigTab technicians={technicians} equipmentTypes={equipmentTypes} />}
      </div>
    </div>
  );
}
