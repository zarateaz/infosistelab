import {
  getServiceDashboard,
  getAdminServices,
  getPendingServices,
  getGalleryServices,
  getClientSummaries,
  getTechnicians,
  getEquipmentTypes,
} from "./actions";
import { ServiciosApp } from "./ServiciosApp";

export default async function AdminServicesPage() {
  const [dashboard, services, pendingServices, galleryServices, clients, technicians, equipmentTypes] = await Promise.all([
    getServiceDashboard(),
    getAdminServices(),
    getPendingServices(),
    getGalleryServices(),
    getClientSummaries(),
    getTechnicians(),
    getEquipmentTypes(),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Servicios técnicos</h1>
      <p className="mt-1 text-sm text-fg-muted">Control de recepción, reparación, entrega y cobro de equipos.</p>

      <div className="mt-6">
        <ServiciosApp
          dashboard={dashboard}
          services={services}
          pendingServices={pendingServices}
          galleryServices={galleryServices}
          clients={clients}
          technicians={technicians}
          equipmentTypes={equipmentTypes}
        />
      </div>
    </div>
  );
}
