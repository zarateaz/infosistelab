import { CobranzaInternet } from "./CobranzaInternet";
import { getInternetClients } from "./internetActions";

export const metadata = { title: "Cobranza de Internet" };

export default async function CobranzaInternetPage() {
  const clients = await getInternetClients();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Cobranza de Internet</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Clientes con servicio mensual: fecha de pago, avisos de vencimiento y cobro por WhatsApp.
      </p>
      <CobranzaInternet clients={clients} />
    </div>
  );
}
