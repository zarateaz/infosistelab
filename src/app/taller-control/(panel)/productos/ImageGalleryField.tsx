"use client";

import { useState } from "react";
import Image from "next/image";
import { Images, X } from "lucide-react";

const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";
const MAX_EXTRA_IMAGES = 3;

/** Up to 3 additional reference photos, alongside the single cover photo
 *  ImageUploadField manages — admin-only, never shown on /tienda or the
 *  storefront card. Mirrors ImageUploadField's "adjust state during render"
 *  pattern so scanner-provided photos show up in the same render instead of
 *  one frame later. */
export function ImageGalleryField({
  defaultValue,
  autoImages,
}: {
  defaultValue?: string[];
  /** Set by the barcode scanner / Alta Rápida when the admin picks more
   *  than one candidate photo — replaces whatever was here before, same as
   *  a fresh scan replaces the cover photo. */
  autoImages?: string[] | null;
}) {
  const [images, setImages] = useState<string[]>(defaultValue ?? []);

  const [lastAppliedAutoImages, setLastAppliedAutoImages] = useState(autoImages);
  if (autoImages !== lastAppliedAutoImages) {
    setLastAppliedAutoImages(autoImages);
    if (autoImages) setImages(autoImages.slice(0, MAX_EXTRA_IMAGES));
  }

  function removeAt(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="sm:col-span-2">
      <label className={labelClass}>
        <span className="inline-flex items-center gap-1.5">
          <Images size={13} />
          Fotos adicionales (opcional, hasta {MAX_EXTRA_IMAGES})
        </span>
      </label>
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {images.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-3">
          {images.map((path, i) => (
            <div key={path} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-bg">
              <Image src={path} alt="" fill sizes="64px" className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Quitar foto"
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-fg-muted">
          Solo referencia interna — no se muestran en la tienda pública. El escáner las llena
          automáticamente si eliges más de una foto.
        </p>
      )}
    </div>
  );
}
