"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  ShoppingCart,
  X,
  AlertTriangle,
  MessageCircle,
  Plus,
  Minus,
  Banknote,
  Smartphone,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { sellOneUnit } from "./actions";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_INFO,
  type PaymentMethodType,
} from "@/lib/paymentMethods";
import {
  buildWhatsAppLink,
  generateSingleProductStockAlertMessage,
} from "@/lib/whatsappStockReport";

function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SellButton({
  productId,
  productName,
  stock,
  unitPrice,
}: {
  productId: string;
  productName: string;
  stock: number;
  unitPrice: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | "">("");
  const [requestId, setRequestId] = useState("");
  const [showInvoiceData, setShowInvoiceData] = useState(false);
  const [docNumber, setDocNumber] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stockNotice, setStockNotice] = useState<{ remaining: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setQuantity(1);
    setPaymentMethod("");
    setRequestId(newRequestId());
    setShowInvoiceData(false);
    setError(null);
    setStockNotice(null);
    setIsOpen(true);
  };

  const confirmSale = () => {
    if (!paymentMethod) {
      setError("Selecciona el método de pago (Efectivo, Yape 1 o Yape 2).");
      return;
    }
    startTransition(async () => {
      try {
        const result = await sellOneUnit({
          productId,
          quantity,
          paymentMethod,
          clientRequestId: requestId || undefined,
          docNumber: docNumber.trim() || undefined,
          nombre: nombre.trim() || undefined,
          email: email.trim() || undefined,
          telefono: telefono.trim() || undefined,
        });

        if (result.error) {
          setError(result.error);
          return;
        }

        setError(null);
        if (result.lowStockAlert && result.remainingStock != null) {
          // Show low stock notification modal
          setStockNotice({ remaining: result.remainingStock });
        } else {
          setIsOpen(false);
          setDocNumber("");
          setNombre("");
          setEmail("");
          setTelefono("");
        }
      } catch {
        setError(
          "No se pudo conectar con el servidor. Inténtalo de nuevo; la venta no se duplicará."
        );
      }
    });
  };

  const handleSendWhatsApp = (remaining: number) => {
    const text = generateSingleProductStockAlertMessage(productName, remaining);
    window.open(buildWhatsAppLink(text), "_blank");
    setIsOpen(false);
    setStockNotice(null);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleOpen}
        disabled={isPending || stock <= 0}
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <ShoppingCart size={13} />
        Vender
      </button>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-bg-alt p-6 shadow-2xl border border-border">
              {stockNotice ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                    <AlertTriangle size={32} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-fg">¡Venta registrada con éxito!</h3>
                    <p className="mt-2 text-sm text-fg-muted">
                      El producto <span className="font-semibold text-fg">&quot;{productName}&quot;</span> ha
                      quedado con{" "}
                      <span className="font-bold text-amber-500">
                        {stockNotice.remaining === 1 ? "1 sola unidad" : `${stockNotice.remaining} unidades (agotado)`}
                      </span>{" "}
                      en inventario.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => handleSendWhatsApp(stockNotice.remaining)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                    >
                      <MessageCircle size={16} />
                      Notificar a WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setStockNotice(null);
                      }}
                      className="rounded-xl border border-border bg-bg px-4 py-2 text-xs font-bold text-fg-muted transition-colors hover:text-fg"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-fg">Vender &quot;{productName}&quot;</h3>
                    <button
                      onClick={() => setIsOpen(false)}
                      aria-label="Cancelar"
                      className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-bg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    Stock actual: <strong className="text-fg">{stock} unidades</strong>
                  </p>

                  <div className="mt-4 space-y-3">
                    {/* Cantidad */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">Cantidad a vender</label>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg text-fg hover:border-accent"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={stock}
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setQuantity(Math.min(stock, Math.max(1, val)));
                          }}
                          className="w-20 text-center rounded-xl border border-border bg-bg py-2 text-sm font-bold text-fg outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg text-fg hover:border-accent"
                        >
                          <Plus size={14} />
                        </button>
                        <span className="text-xs text-fg-muted">de {stock} disp.</span>
                      </div>
                    </div>

                    {/* Método de pago */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                        Método de pago <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 grid grid-cols-3 gap-1.5">
                        {PAYMENT_METHODS.map((m) => {
                          const active = paymentMethod === m;
                          const Icon = m === "EFECTIVO" ? Banknote : Smartphone;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setPaymentMethod(m);
                                setError(null);
                              }}
                              className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-[10px] font-bold transition-all active:scale-95 ${
                                active
                                  ? "border-accent bg-accent/10 text-accent shadow-sm"
                                  : "border-border bg-bg text-fg-muted hover:border-accent/50 hover:text-fg"
                              }`}
                            >
                              <Icon size={15} />
                              <span className="leading-tight text-center">
                                {PAYMENT_METHOD_INFO[m].name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {paymentMethod && (
                        <p className="mt-1.5 text-[10px] font-medium text-fg-muted">
                          {PAYMENT_METHOD_INFO[paymentMethod].titular}
                          {PAYMENT_METHOD_INFO[paymentMethod].formattedPhone
                            ? ` · ${PAYMENT_METHOD_INFO[paymentMethod].formattedPhone}`
                            : ""}
                        </p>
                      )}
                    </div>

                    {/* Descripción automática + total */}
                    <div className="rounded-xl border border-border bg-bg/60 px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-fg-muted">
                        Descripción automática
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs font-bold text-fg">
                        {productName}
                        {quantity > 1 ? ` (x${quantity})` : ""}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-bg/60 px-3 py-2">
                      <span className="text-[11px] font-semibold text-fg-muted">
                        Total a cobrar
                      </span>
                      <span className="font-display text-lg font-black text-fg">
                        S/. {(unitPrice * quantity).toFixed(2)}
                      </span>
                    </div>

                    {/* Comprobante: opcional, oculto por defecto */}
                    <button
                      type="button"
                      onClick={() => setShowInvoiceData((value) => !value)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-bg-alt px-3 py-2 text-[11px] font-bold text-fg-muted transition-colors hover:text-fg"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} />
                        Datos para comprobante (opcional)
                      </span>
                      {showInvoiceData ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showInvoiceData && (
                      <div className="space-y-2 rounded-xl border border-border bg-bg/60 p-2.5">
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
                    )}
                  </div>

                  <button
                    onClick={confirmSale}
                    disabled={isPending || !paymentMethod}
                    className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending
                      ? "Vendiendo..."
                      : `Confirmar venta · S/. ${(unitPrice * quantity).toFixed(2)}`}
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
