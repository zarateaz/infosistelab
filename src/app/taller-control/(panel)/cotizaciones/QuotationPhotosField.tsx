"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  ClipboardPaste,
  ImageIcon,
  Loader2,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { uploadQuotationPhoto } from "./upload-actions";

interface QuotationPhotosFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxPhotos?: number;
}

export function QuotationPhotosField({
  images,
  onChange,
  maxPhotos = 12,
}: QuotationPhotosFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to process and upload a list of File objects
  async function processFiles(files: File[]) {
    const remainingSlots = maxPhotos - images.length;
    if (remainingSlots <= 0) {
      setError(`Límite máximo de ${maxPhotos} fotos alcanzado.`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];

    for (const file of filesToUpload) {
      if (!file.type.startsWith("image/")) {
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        const res = await uploadQuotationPhoto(dataUrl);
        if (res.error) {
          setError(res.error);
        } else if (res.path) {
          uploadedUrls.push(res.path);
        }
      } catch (err: any) {
        setError(err.message || "Error al procesar archivo.");
      }
    }

    setIsUploading(false);

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls]);
    }
  }

  // Handle file input selection
  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      processFiles(Array.from(fileList));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Handle Drag & Drop
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }

  // Handle clipboard paste (Ctrl+V) anywhere on window while field is mounted
  useEffect(() => {
    function handlePasteEvent(e: ClipboardEvent) {
      // Don't intercept if user is typing in a text input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        target !== fileInputRef.current
      ) {
        // If it's a plain text field, let text paste normally unless clipboard has files
        if (!e.clipboardData?.files || e.clipboardData.files.length === 0) {
          return;
        }
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        processFiles(imageFiles);
      }
    }

    window.addEventListener("paste", handlePasteEvent);
    return () => {
      window.removeEventListener("paste", handlePasteEvent);
    };
  }, [images, maxPhotos]);

  // Handle direct click on "Pegar imagen" button
  async function handlePasteButtonClick() {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        const imageFiles: File[] = [];
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const file = new File([blob], `pegar_${Date.now()}.png`, { type });
              imageFiles.push(file);
            }
          }
        }
        if (imageFiles.length > 0) {
          await processFiles(imageFiles);
          return;
        }
      }
    } catch {
      // Browser permission blocked or not supported
    }

    // Fallback alert/hint
    setError("Copia una imagen y presiona Ctrl + V en tu teclado para pegarla directamente.");
    setTimeout(() => setError(null), 4000);
  }

  function handleRemove(indexToRemove: number) {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-bg/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <ImageIcon size={16} />
          </div>
          <div>
            <span className="text-xs font-bold text-fg">
              Fotos del Producto o Anexo Técnico
            </span>
            <span className="ml-2 text-[11px] text-fg-muted font-medium">
              ({images.length}/{maxPhotos} fotos)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePasteButtonClick}
            disabled={isUploading || images.length >= maxPhotos}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            title="Pega una imagen copiada en tu portapapeles (Ctrl + V)"
          >
            <ClipboardPaste size={13} className="text-accent" />
            Pegar (Ctrl+V)
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || images.length >= maxPhotos}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition-all hover:bg-accent-hover disabled:opacity-50 shadow-sm"
          >
            {isUploading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Camera size={13} />
            )}
            Galería / Subir
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative transition-all rounded-xl border-2 border-dashed p-3 ${
          isDragging
            ? "border-accent bg-accent/5 scale-[1.01]"
            : "border-border/60 hover:border-accent/40 bg-bg/20"
        }`}
      >
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Camera size={22} />
            </div>
            <p className="text-xs font-semibold text-fg">
              Arrastra varias fotos aquí, súbelas desde tu galería o{" "}
              <span className="text-accent underline font-bold cursor-pointer" onClick={handlePasteButtonClick}>
                pega directamente con Ctrl + V
              </span>
            </p>
            <p className="mt-1 text-[11px] text-fg-muted">
              Aparecerán automáticamente en el anexo fotográfico de la cotización y en el PDF oficial.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-white shadow-xs transition-all hover:shadow-md"
                >
                  <Image
                    src={url}
                    alt={`Foto anexa ${idx + 1}`}
                    fill
                    sizes="120px"
                    className="object-contain p-1.5"
                  />

                  {/* Badge order */}
                  <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                    {idx + 1}
                  </span>

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModalUrl(url)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-fg hover:bg-white hover:scale-110 transition-transform"
                      title="Ver en grande"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 hover:scale-110 transition-transform"
                      title="Eliminar foto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add more button tile inside the grid */}
              {images.length < maxPhotos && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent hover:bg-accent/5"
                >
                  <Camera size={18} />
                  <span className="text-[10px] font-bold uppercase">+ Foto</span>
                </button>
              )}
            </div>

            <p className="mt-2 text-[11px] text-fg-muted flex items-center gap-1">
              <span>💡</span>
              <span>Puedes pegar capturas directamente con <strong>Ctrl + V</strong> en cualquier momento.</span>
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
          {error}
        </p>
      )}

      {/* Lightbox / Preview Modal */}
      {previewModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-bg p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X size={16} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewModalUrl}
              alt="Vista previa"
              className="max-h-[80vh] max-w-[80vw] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
