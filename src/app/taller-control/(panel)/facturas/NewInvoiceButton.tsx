"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { createManualInvoice } from "./actions";

export function NewInvoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [nombre, setNombre] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setDescripcion("");
    setCantidad("1");
    setPrecioUnitario("");
    setNombre("");
    setDocNumber("");
    setEmail("");
    setTelefono("");
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await createManualInvoice({
        descripcion,
        cantidad,
        precioUnitario,
        docNumber: docNumber.trim() || undefined,
        nombre: nombre.trim() || undefined,
        email: email.trim() || undefined,
        telefono: telefono.trim() || undefined,
      });
      setError(result.error ?? null);
      if (!result.error) {
        setIsOpen(false);
        reset();
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90"
      >
        <Plus size={14} />
        Nueva factura
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-sm rounded-2xl bg-bg-alt p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-fg">Emitir comprobante manual</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Cancelar"
                  className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-bg"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Para una venta de mostrador que no está en el catálogo (ej. un servicio).
              </p>

              <div className="mt-4 space-y-2.5">
                <input
                  type="text"
                  placeholder="Descripción (ej. Instalación de software)"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                />
                <div className="flex gap-2.5">
                  <input
                    type="number"
                    min={1}
                    placeholder="Cantidad"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-24 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Precio unitario (S/.)"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                  />
                </div>

                <hr className="border-border" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-fg-muted">Cliente (opcional)</p>

                <input
                  type="text"
                  placeholder="Nombre / razón social"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="DNI (8 dígitos) o RUC (11 dígitos)"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                />
                <input
                  type="email"
                  placeholder="Correo (para enviar el comprobante)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                />
                <input
                  type="tel"
                  placeholder="Celular (para reenviar por WhatsApp)"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}

              <button
                onClick={confirm}
                disabled={isPending || !descripcion.trim() || !precioUnitario}
                className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? "Emitiendo..." : "Emitir comprobante"}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
