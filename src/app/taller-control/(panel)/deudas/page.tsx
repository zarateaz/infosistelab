import { Metadata } from "next";
import { getDebts } from "./actions";
import { DeudasClient } from "./DeudasClient";
import { isPeriod, todayInLima } from "./deudas";

export const metadata: Metadata = {
  title: "Deudas y Obligaciones | Infosistel",
  description: "Control de pagos recurrentes, servicios, alquileres y deudas del taller.",
};

export default async function DeudasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string }>;
}) {
  const { mes, vista } = await searchParams;
  const debts = await getDebts();
  const today = todayInLima();
  const currentPeriod = today.slice(0, 7);

  const period = mes && isPeriod(mes) ? mes : currentPeriod;
  const view = vista === "anual" ? "anual" : "mes";

  return (
    <div className="pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-fg">
          Deudas y Obligaciones
        </h1>
        <p className="text-sm text-fg-muted">
          Seguimiento y control de obligaciones fijas mensuales: alquileres, impuestos, sueldos, servicios, internet y celulares.
        </p>
      </div>

      <DeudasClient debts={debts} period={period} view={view} today={today} />
    </div>
  );
}
