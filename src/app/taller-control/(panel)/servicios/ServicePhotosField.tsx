"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X } from "lucide-react";
import { uploadServicePhoto } from "./upload-actions";

const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";
const MAX_PHOTOS = 4;

export interface PendingPhoto {
  path: string;
  originalName: string;
}

/** Multi-photo evidence uploader — same base64-in/sharp-webp-out pipeline as
 *  productos/ImageUploadField, extended to accumulate several files instead
 *  of one. The hidden "photos" input carries the JSON array `createService`/
 *  `updateService` read; nothing here touches existing photos on a service
 *  (see ExistingPhotoThumb in ServiceRow for that). */
export function ServicePhotosField({
  onUploadingChange,
  label = "Evidencia fotográfica",
}: {
  onUploadingChange?: (uploading: boolean) => void;
  label?: string;
}) {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    if (files.length === 0) return;

    setStatus("loading");
    setError("");
    onUploadingChange?.(true);
    try {
      for (const file of files) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        const result = await uploadServicePhoto(dataUrl);
        if (result.error) {
          setStatus("error");
          setError(result.error);
          continue;
        }
        if (result.path) {
          setPhotos((prev) => [...prev, { path: result.path!, originalName: file.name }]);
        }
      }
      if (status !== "error") setStatus("idle");
    } catch {
      setStatus("error");
      setError("No se pudo subir una foto. Intenta de nuevo o usa archivos más livianos.");
    } finally {
      onUploadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="sm:col-span-2">
      <label className={labelClass}>{label}</label>
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {photos.map((p, i) => (
          <div key={p.path} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-bg">
            <Image src={p.path} alt="" fill sizes="64px" className="object-cover" />
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

        {photos.length < MAX_PHOTOS && (
          <label className="inline-flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent">
            {status === "loading" ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} strokeWidth={1.5} />}
            <span className="text-[9px] font-bold uppercase">Subir</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
          </label>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-fg-muted">Fotos del antes/después o del trabajo realizado (opcional, máximo 4).</p>
      )}
    </div>
  );
}
