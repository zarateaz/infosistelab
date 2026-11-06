import { listQuotations } from "./actions";
import { CotizacionesClient } from "./CotizacionesClient";

export const dynamic = "force-dynamic";

export default async function AdminCotizacionesPage() {
  try {
    const quotations = await listQuotations();
    return <CotizacionesClient initialQuotations={quotations} />;
  } catch (err) {
    console.error("[cotizaciones/page] Error loading quotations:", err);
    return <CotizacionesClient initialQuotations={[]} />;
  }
}
