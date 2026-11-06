import type { Metadata } from "next";
import { TrackingForm } from "./TrackingForm";

export const metadata: Metadata = {
  title: "Seguimiento de reparación",
  description: "Consulta el estado de tu reparación en INFOSISTEL ingresando tu DNI.",
};

export default function SeguimientoPage() {
  return (
    <main className="bg-aurora min-h-screen pb-24 pt-32 md:pt-40">
      <div className="mx-auto max-w-2xl px-6 md:px-10">
        <div className="text-center">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-accent">
            Servicio técnico
          </span>
          <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight tracking-tight text-fg">
            Seguimiento de tu reparación
          </h1>
          <p className="mt-4 text-fg-muted">
            Ingresa el DNI con el que registraste tu equipo y revisa en qué va — sin
            llamadas, sin esperar. Se actualiza en tiempo real desde nuestro taller.
          </p>
        </div>

        <div className="mt-10">
          <TrackingForm />
        </div>
      </div>
    </main>
  );
}
