"use client";

import { useState } from "react";
import Image from "next/image";
import type { AdminService } from "./actions";
import { PAYMENT_STATUS_LABELS, formatFecha } from "./utils";
import { PhotoLightbox } from "./PhotoLightbox";

function statusBadgeClass(status: string): string {
  if (status === "PAGADO") return "bg-accent/10 text-accent";
  if (status === "PARCIAL") return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-600";
}

export function GalleryTab({ services }: { services: AdminService[] }) {
  const [lightbox, setLightbox] = useState<AdminService | null>(null);

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-fg">Galería</h2>
      <p className="mt-1 text-sm text-fg-muted">Evidencia fotográfica de todos los trabajos</p>

      {services.length === 0 ? (
        <div className="mt-6 admin-glass flex flex-col items-center gap-2 rounded-[var(--radius-lg)] py-14 text-center text-fg-muted">
          <p className="font-semibold">Aún no hay fotografías registradas.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setLightbox(s)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-bg text-left"
            >
              <Image src={s.photos[0].path} alt="" fill sizes="25vw" className="object-cover transition-transform group-hover:scale-105" />
              <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {s.photos.length} foto{s.photos.length > 1 ? "s" : ""}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
                <p className="truncate text-xs font-bold text-white">{s.clientName}</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="truncate text-[10px] text-white/80">{s.title} · {formatFecha(s.serviceDate)}</span>
                  <span className={`ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusBadgeClass(s.paymentStatus)}`}>
                    {PAYMENT_STATUS_LABELS[s.paymentStatus]}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {lightbox && <PhotoLightbox photos={lightbox.photos} onClose={() => setLightbox(null)} />}
    </div>
  );
}
