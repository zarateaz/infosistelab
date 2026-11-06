"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { X } from "lucide-react";

/**
 * Live camera barcode reader — full-screen overlay, closes itself the
 * instant a code decodes. Needs `Permissions-Policy: camera=(self)`,
 * scoped to /taller-control only (next.config.ts) — the public site never asks
 * for camera access.
 */
export function CameraScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, _err, controls) => {
        controlsRef.current = controls;
        if (cancelled || !result) return;
        controls.stop();
        onDetected(result.getText());
      })
      .catch(() => {
        if (!cancelled) {
          setError("No se pudo acceder a la cámara. Revisa los permisos del navegador para este sitio.");
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDetected is stable per ScannerPanel render
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 p-6">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar cámara"
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {error ? (
        <p className="max-w-xs text-center text-sm text-white">{error}</p>
      ) : (
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            className="max-h-[70vh] w-full max-w-md rounded-xl bg-black"
          />
          <p className="mt-4 text-sm text-white/70">Apunta la cámara al código de barras</p>
        </>
      )}
    </div>
  );
}
