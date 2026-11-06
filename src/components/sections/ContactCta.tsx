"use client";

import { MapPin, Phone, Clock, Mail, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/scroll/Reveal";

const ADDRESSES = [
  "Av. Giráldez 274, Semisótano Stand S25, Huancayo",
  "Av. Giráldez 274, 1er Nivel Stand B-10, Huancayo",
];

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "Av. Giráldez 274, Huancayo, Perú"
)}`;

const DETAILS = [
  {
    icon: Phone,
    label: "Teléfono / WhatsApp",
    value: "+51 900 000 000",
    href: "https://wa.me/51900000000",
    color: "#25D366",
    bg: "rgba(37, 211, 102, 0.12)",
  },
  {
    icon: Mail,
    label: "Correo electrónico",
    value: "ecaballero@hotmail.com",
    href: "mailto:ecaballero@hotmail.com",
    color: "#0a5fdb",
    bg: "rgba(10, 95, 219, 0.1)",
  },
  {
    icon: Clock,
    label: "Horario de atención",
    value: "Lun. a sáb., 9:00 am – 7:00 pm",
    color: "#56607a",
    bg: "rgba(86, 96, 122, 0.1)",
  },
];

export function ContactCta() {
  return (
    <section id="contacto" className="bg-aurora relative py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <Reveal>
          <div className="glass-panel rounded-[var(--radius-lg)] px-8 py-14 md:px-16 md:py-20">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-stretch">
              <div className="flex flex-col">
                <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-tight text-fg">
                  Visítanos en Huancayo
                </h2>

                <dl className="mt-8 flex-1 space-y-6">
                  <div className="flex items-start gap-3.5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "rgba(10, 95, 219, 0.1)", color: "#0a5fdb" }}
                    >
                      <MapPin size={18} strokeWidth={1.75} />
                    </div>
                    <div>
                      <dt className="text-sm font-bold text-fg">Dirección</dt>
                      <dd className="mt-1 space-y-1 text-sm text-fg-muted">
                        {ADDRESSES.map((addr) => (
                          <p key={addr}>• {addr}</p>
                        ))}
                      </dd>
                    </div>
                  </div>

                  {DETAILS.map((d) => (
                    <div key={d.label} className="flex items-start gap-3.5">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: d.bg, color: d.color }}
                      >
                        <d.icon size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <dt className="text-sm font-bold text-fg">{d.label}</dt>
                        {d.href ? (
                          <a
                            href={d.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block text-sm font-medium text-fg-muted transition-colors hover:text-accent"
                          >
                            {d.value}
                          </a>
                        ) : (
                          <dd className="mt-1 text-sm text-fg-muted">{d.value}</dd>
                        )}
                      </div>
                    </div>
                  ))}
                </dl>

                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center justify-center gap-2.5 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-accent-fg transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Cómo llegar en Google Maps
                  <ArrowRight size={16} />
                </a>
              </div>

              <div className="relative min-h-[420px] overflow-hidden rounded-[var(--radius-md)] border border-border">
                <iframe
                  src="https://www.google.com/maps?q=Av.+Gir%C3%A1ldez+274,+Huancayo,+Peru&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: "block", minHeight: 420 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Infosistel — Av. Giráldez 274, Huancayo"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
