import { PriceCalculator } from "./PriceCalculator";

export const metadata = { title: "Calculadora de Precios" };

export default function CalculadoraPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Calculadora de precios</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Calcula precios de venta con IGV, margen sobre venta o recargo sobre costo.
      </p>
      <div className="mt-6">
        <PriceCalculator />
      </div>
    </div>
  );
}
