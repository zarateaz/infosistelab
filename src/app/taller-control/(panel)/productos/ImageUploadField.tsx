"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadProductImage } from "./upload-actions";

const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";

export function ImageUploadField({
  defaultValue,
  onUploadingChange,
  autoImagePath,
}: {
  defaultValue?: string | null;
  /** Lets the parent form disable "Guardar" while an upload is in flight —
   *  without this, submitting mid-upload silently saves the OLD image
   *  path, because the hidden input hasn't been updated yet. */
  onUploadingChange?: (uploading: boolean) => void;
  /** Set by the barcode scanner when a listing already had its own photo —
   *  fills in the same way a manual upload would, without a file dialog. */
  autoImagePath?: string | null;
}) {
  const [imagePath, setImagePath] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imgLoadError, setImgLoadError] = useState(false);

  // Adjusting state during render (React's documented pattern) instead of
  // an effect, so a scanner-provided photo shows up in the same render
  // instead of one frame later.
  const [lastAppliedAutoPath, setLastAppliedAutoPath] = useState(autoImagePath);
  if (autoImagePath !== lastAppliedAutoPath) {
    setLastAppliedAutoPath(autoImagePath);
    if (autoImagePath) {
      setImagePath(autoImagePath);
      setImgLoadError(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("loading");
    setError("");
    setImgLoadError(false);
    onUploadingChange?.(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const result = await uploadProductImage(dataUrl);
      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }

      setImagePath(result.path ?? "");
      setImgLoadError(false);
      setStatus("idle");
    } catch {
      // A thrown/rejected Server Action (network hiccup, request body over
      // the configured limit, etc.) must still land here — silently doing
      // nothing would leave "Guardar" enabled with the OLD image path
      // still in the hidden input, and the admin would have no idea the
      // upload never happened.
      setStatus("error");
      setError("No se pudo subir la imagen. Intenta de nuevo o usa un archivo más liviano.");
    } finally {
      onUploadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="sm:col-span-2">
      <label className={labelClass}>Imagen del producto</label>
      {/* The only thing the form action actually reads — everything else
          here is just the upload UI around setting this one value. */}
      <input type="hidden" name="image" value={imagePath} />

      <div className="mt-2 flex items-center gap-4">
        {imagePath ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-bg">
            {!imgLoadError ? (
              <Image
                src={imagePath}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
                onError={() => setImgLoadError(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-[10px] text-amber-600 bg-amber-500/10">
                <ImagePlus size={18} className="mb-0.5 text-amber-500" />
                <span>Foto asignada</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setImagePath("");
                setImgLoadError(false);
              }}
              aria-label="Quitar imagen"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border-strong text-fg-muted">
            <ImagePlus size={22} strokeWidth={1.5} />
          </div>
        )}

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border-strong px-5 py-2.5 text-sm font-bold text-fg transition-colors hover:border-accent hover:text-accent">
          {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          {imagePath ? "Cambiar foto" : "Subir foto"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFile}
            className="hidden"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-fg-muted">
          Sin foto, la tarjeta del producto muestra el ícono de la categoría.
        </p>
      )}
    </div>
  );
}
