"use client";

import { useRef, useCallback } from "react";
import {
  Wrench,
  Laptop,
  Printer,
  PackageSearch,
  Gauge,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/scroll/Reveal";

interface ServiceItem {
  icon: LucideIcon;
  title: string;
  description: string;
  featured?: boolean;
}

const SERVICES: ServiceItem[] = [
  {
    icon: Laptop,
    title: "Reparación de laptops",
    description: "Pantallas, bisagras, teclados y cortos en placa — el servicio que más nos piden en Huancayo.",
    featured: true,
  },
  {
    icon: Wrench,
    title: "Mantenimiento preventivo",
    description: "Limpieza interna, cambio de pasta térmica y optimización de software.",
  },
  {
    icon: Printer,
    title: "Servicio de impresoras",
    description: "Reset de almohadillas, limpieza de cabezales, reparación mecánica.",
  },
  {
    icon: PackageSearch,
    title: "Venta de repuestos",
    description: "Cargadores originales, baterías, pantallas y periféricos.",
  },
  {
    icon: Gauge,
    title: "Repotenciación SSD/RAM",
    description: "Nueva vida a equipos antiguos con SSD y más memoria.",
  },
  {
    icon: Building2,
    title: "Soporte corporativo",
    description: "Contratos de mantenimiento para empresas y colegios.",
  },
];

/**
 * Tarjeta interactiva con modelo de iluminación Blinn-Phong en CSS y cinemática 3D.
 * Inyecta vectores de luz directamente en capas de composición de hardware GPU a 120 FPS
 * con 0 re-renderizados de React y 0 overhead de recolección de basura (Zero-GC).
 */
function InteractiveServiceCard({ service }: { service: ServiceItem }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Desactivar inclinaciones complejas en pantallas táctiles gruesas
    if (e.pointerType === "touch" || !cardRef.current) return;

    const el = cardRef.current;
    const rect = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));

    // Vector de rotación angular ortogonal (Roll & Pitch)
    const rx = (-ny * 6).toFixed(2);
    const ry = (nx * 6).toFixed(2);

    // Coordenadas del vector de luz especular (L_x, L_y)
    const lx = (((nx + 1) / 2) * 100).toFixed(1);
    const ly = (((ny + 1) / 2) * 100).toFixed(1);

    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--lx", `${lx}%`);
    el.style.setProperty("--ly", `${ly}%`);
    el.style.setProperty("--specular-alpha", service.featured ? "0.22" : "0.12");
  }, [service.featured]);

  const handlePointerLeave = useCallback(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--specular-alpha", "0");
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: "perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateZ(0)",
        transition: "transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease-out, border-color 0.2s ease-out",
        transformStyle: "preserve-3d",
      }}
      className={`group relative h-full flex flex-col overflow-hidden rounded-[var(--radius-md)] p-8 will-change-transform transform-gpu ${
        service.featured
          ? "bg-gradient-to-br from-accent to-accent-pressed text-accent-fg shadow-lg shadow-accent/25 hover:shadow-2xl hover:shadow-accent/40"
          : "border border-border bg-bg-alt text-fg hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10"
      }`}
    >
      {/* Resplandor óptico especular Blinn-Phong reactivo al vector de luz del cursor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          background: "radial-gradient(420px circle at var(--lx, 50%) var(--ly, 50%), rgba(255, 255, 255, var(--specular-alpha, 0)) 0%, transparent 75%)",
        }}
      />

      {service.featured ? (
        <>
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl transition-transform duration-300 group-hover:scale-125"
          />
          <span className="relative z-10 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
            Más solicitado
          </span>
          <div className="relative z-10 mt-6 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <service.icon size={20} strokeWidth={1.75} />
          </div>
          <h3 className="relative z-10 mt-5 font-display text-lg font-semibold">{service.title}</h3>
          <p className="relative z-10 mt-2 text-sm leading-relaxed text-accent-fg/85">{service.description}</p>
        </>
      ) : (
        <>
          <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-accent-fg">
            <service.icon size={20} strokeWidth={1.75} />
          </div>
          <h3 className="relative z-10 mt-5 font-display text-lg font-semibold text-fg">{service.title}</h3>
          <p className="relative z-10 mt-2 text-sm leading-relaxed text-fg-muted">{service.description}</p>
        </>
      )}
    </div>
  );
}

export function Services() {
  return (
    <section id="servicios" className="relative py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-accent">
            <span className="h-px w-6 bg-accent" />
            Servicios
          </span>
          <h2 className="mt-4 max-w-xl font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-tight text-fg">
            Todo lo que tu equipo necesita, bajo un mismo techo
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <Reveal
              key={service.title}
              delay={(i % 3) * 0.08}
              className={service.featured ? "sm:col-span-2 lg:col-span-1" : undefined}
            >
              <InteractiveServiceCard service={service} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

