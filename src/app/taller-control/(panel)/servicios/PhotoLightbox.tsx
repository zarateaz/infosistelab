"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import type { AdminServicePhoto } from "./actions";

/** Full-screen prev/next photo viewer — portals to document.body for the
 *  same reason ConfirmDialog does (see its comment): callers render inside
 *  an .admin-glass card whose backdrop-filter would otherwise clip the
 *  overlay to that card instead of the viewport. */
export function PhotoLightbox({ photos, startIndex = 0, onClose }: { photos: AdminServicePhoto[]; startIndex?: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const photo = photos[index];
  if (!photo) return null;

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/85 p-6" onClick={onClose}>
      <button onClick={onClose} aria-label="Cerrar" className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X size={18} />
      </button>
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Anterior"
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="relative h-full max-h-[85vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <Image src={photo.path} alt="" fill sizes="100vw" className="object-contain" />
      </div>
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Siguiente"
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <ChevronRight size={20} />
        </button>
      )}
      {photos.length > 1 && (
        <div className="absolute bottom-6 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>,
    document.body
  );
}
