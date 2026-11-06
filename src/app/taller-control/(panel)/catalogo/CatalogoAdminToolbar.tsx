"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Tv,
  Copy,
  Check,
  QrCode,
  Maximize2,
  X,
  Smartphone
} from "lucide-react";

export function CatalogoAdminToolbar() {
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [catalogUrl, setCatalogUrl] = useState("/catalogo");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}/catalogo`;
      setCatalogUrl(fullUrl);
      QRCode.toDataURL(fullUrl, {
        width: 320,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
        .then(setQrUrl)
        .catch(() => {});
    }
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <Tv size={18} />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-fg">
              Proyección en Pantalla Táctil / Kiosco
            </h2>
          </div>
          <p className="text-sm text-fg-muted">
            Enlace público directo optimizado para tótems interactivos, tablets de mostrador o Smart TVs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botón QR */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-fg transition-all hover:border-cyan-500/40 hover:text-cyan-500 active:scale-95"
          >
            <QrCode size={18} />
            <span>Código QR para Pantallas</span>
          </button>

          {/* Botón Copiar Enlace */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-fg transition-all hover:border-cyan-500/40 active:scale-95"
          >
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            <span>{copied ? "¡Enlace Copiado!" : "Copiar Enlace"}</span>
          </button>

          {/* Botón Abrir Kiosco */}
          <a
            href="/catalogo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-600/25 transition-all hover:brightness-110 active:scale-95"
          >
            <Maximize2 size={18} />
            <span>Abrir Kiosco Pantalla Completa</span>
          </a>
        </div>
      </div>

      {/* Modal QR de configuración */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 text-center shadow-2xl space-y-5">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border text-fg-muted hover:text-fg"
            >
              <X size={20} />
            </button>

            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
              <Smartphone size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-fg">Escanear para abrir en Pantalla</h3>
              <p className="text-xs text-fg-muted">
                Apunta la cámara de tu tablet o pantalla táctil a este código para iniciar el catálogo interactivo al instante.
              </p>
            </div>

            <div className="flex justify-center p-2">
              {qrUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="QR Kiosco"
                  className="h-56 w-56 rounded-2xl border border-border bg-white p-3 shadow-inner"
                />
              )}
            </div>

            <div className="rounded-2xl bg-bg-alt p-3 font-mono text-xs text-fg-muted break-all select-all">
              {catalogUrl}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-bold text-fg hover:bg-bg-alt"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
