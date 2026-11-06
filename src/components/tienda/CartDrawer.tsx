"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X, ShoppingCart, MessageCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { CategoryIcon } from "@/components/tienda/categoryIcons";
import { createOrder } from "@/app/tienda/actions";
import { digitsOnly } from "@/lib/sanitize";
import type { Product } from "@/types";

export interface CartLine {
  product: Product;
  quantity: number;
}

const WHATSAPP_NUMBER = "51900000000";

/** Simple pero letal: cada regla atrapa el error real de un formulario
 *  público (número con letras, celular de 4 dígitos, correo sin arroba)
 *  en vez de dejar que llegue al servidor o, peor, a NubeFacT/SUNAT. */
function normalizePeruPhone(v: string): string {
  const digits = digitsOnly(v);
  return digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits;
}

function validateName(v: string): string | null {
  const t = v.trim();
  if (!t) return "Ingresa tu nombre completo.";
  if (t.length < 3) return "Nombre muy corto.";
  if (!/^[a-zA-ZÀ-ÿ\s'.-]+$/.test(t)) return "Solo letras y espacios.";
  return null;
}

function validatePhone(v: string): string | null {
  const digits = normalizePeruPhone(v);
  if (!digits) return "Ingresa tu número de celular.";
  if (digits.length !== 9 || !digits.startsWith("9")) return "Celular inválido (9 dígitos, ej. 987654321).";
  return null;
}

function validateEmail(v: string): string | null {
  const t = v.trim();
  if (!t) return null; // opcional
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "Correo inválido.";
  return null;
}

function validateDoc(v: string): string | null {
  const digits = digitsOnly(v);
  if (!digits) return null; // opcional
  if (digits.length !== 8 && digits.length !== 11) return "DNI (8 dígitos) o RUC (11 dígitos).";
  return null;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  onRemove,
  onOrderPlaced,
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartLine[];
  onRemove: (productId: string) => void;
  onOrderPlaced: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [email, setEmail] = useState("");
  // Colapsado por defecto — para pedir por WhatsApp solo hacen falta nombre
  // y celular; correo/DNI-RUC son solo para quien además quiere su
  // boleta/factura por correo, así que no deben competir por atención con
  // los dos campos que sí bloquean el pedido.
  const [showInvoiceFields, setShowInvoiceFields] = useState(false);
  const [touched, setTouched] = useState<Record<"name" | "phone" | "email" | "docNumber", boolean>>({
    name: false,
    phone: false,
    email: false,
    docNumber: false,
  });
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNotice, setInvoiceNotice] = useState<string | null>(null);

  const fieldErrors = useMemo(
    () => ({
      name: validateName(name),
      phone: validatePhone(phone),
      email: validateEmail(email),
      docNumber: validateDoc(docNumber),
    }),
    [name, phone, email, docNumber]
  );
  const showError = (field: keyof typeof fieldErrors) => (touched[field] || attempted) && fieldErrors[field];
  const markTouched = (field: keyof typeof touched) => setTouched((t) => ({ ...t, [field]: true }));
  const fieldClass = (field: keyof typeof fieldErrors) =>
    // text-base (16px), not text-sm — below 16px, iOS Safari auto-zooms the
    // whole page on focus, which on checkout (where the phone number goes)
    // is the worst possible place for that to happen.
    `w-full rounded-xl bg-bg px-4 py-3 text-base text-fg outline-none placeholder:text-fg-muted ring-1 ${
      showError(field) ? "ring-red-400" : "ring-transparent"
    }`;

  const total = cart.reduce((sum, line) => {
    const unit = line.product.onSale && line.product.salePrice ? line.product.salePrice : line.product.price;
    return sum + unit * line.quantity;
  }, 0);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  if (!isOpen) return null;

  const hasFieldErrors = !!(fieldErrors.name || fieldErrors.phone || fieldErrors.email || fieldErrors.docNumber);

  const handleCheckout = async () => {
    setError(null);
    setAttempted(true);
    if (hasFieldErrors) return;

    const normalizedPhone = normalizePeruPhone(phone);
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        customerName: name.trim(),
        customerPhone: normalizedPhone,
        docNumber: docNumber.trim() || undefined,
        customerEmail: email.trim() || undefined,
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      });

      if (order.invoiceStatus === "ACEPTADO" && email.trim()) {
        setInvoiceNotice("Tu boleta/factura fue enviada a tu correo.");
      } else if (order.invoiceStatus && order.invoiceStatus !== "ACEPTADO") {
        setInvoiceNotice("Tu pedido se registró, pero hubo un problema al emitir el comprobante. Te contactaremos.");
      }

      const lines = cart
        .map((line) => {
          const unit = line.product.onSale && line.product.salePrice ? line.product.salePrice : line.product.price;
          return `- ${line.product.name} (x${line.quantity}) - S/. ${(unit * line.quantity).toFixed(2)}`;
        })
        .join("\n");
      const message = `Hola INFOSISTEL! Quisiera hacer un pedido:\n\n*Cliente:* ${name.trim()}\n*Celular:* ${normalizedPhone}\n\n*Productos:*\n${lines}\n\n*Total:* S/. ${total.toFixed(2)}\n\n¿Tienen disponibilidad?`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
      onOrderPlaced();
      // Si hay algo que contarle sobre el comprobante, no cerramos el
      // drawer todavía — se queda viendo el aviso hasta que lo cierre él.
      if (!order.invoiceStatus) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pedido. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
      <div className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-sm flex-col bg-bg-alt shadow-2xl sm:max-w-md">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ShoppingCart size={16} />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none text-fg">Tu carrito</h2>
              <p className="text-xs font-medium text-fg-muted">
                {count} producto{count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-fg-muted transition-colors hover:bg-bg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {invoiceNotice ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <MessageCircle size={28} className="text-accent" />
              </div>
              <p className="text-sm font-bold text-fg">{invoiceNotice}</p>
              <button
                onClick={onClose}
                className="rounded-xl bg-bg px-5 py-2.5 text-xs font-bold text-fg transition-colors hover:bg-accent/10"
              >
                Cerrar
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg">
                <ShoppingCart size={28} className="text-fg-muted opacity-40" />
              </div>
              <p className="text-sm font-bold text-fg-muted">Tu carrito está vacío</p>
            </div>
          ) : (
            cart.map((line) => {
              const unit = line.product.onSale && line.product.salePrice ? line.product.salePrice : line.product.price;
              return (
                <div key={line.product.id} className="flex items-center gap-3 rounded-2xl bg-bg p-3">
                  <div className="relative h-14 w-14 shrink-0 rounded-xl bg-bg-alt">
                    {line.product.image ? (
                      <Image src={line.product.image} alt={line.product.name} fill className="object-contain p-1.5" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <CategoryIcon category={line.product.category} size={22} strokeWidth={1.25} className="text-fg-muted opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold leading-snug text-fg">{line.product.name}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">Cant: {line.quantity}</p>
                    <p className="text-sm font-black text-accent">S/. {(unit * line.quantity).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => onRemove(line.product.id)}
                    className="shrink-0 rounded-xl p-1.5 text-fg-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            className="space-y-4 border-t border-border p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-black text-fg">Total</span>
              <span className="text-2xl font-black tracking-tight text-accent">S/. {total.toFixed(2)}</span>
            </div>
            <div className="space-y-2.5">
              <div>
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched("name")}
                  className={fieldClass("name")}
                />
                {showError("name") && <p className="mt-1 pl-1 text-[11px] font-bold text-red-400">{fieldErrors.name}</p>}
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Número de celular"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => markTouched("phone")}
                  className={fieldClass("phone")}
                />
                {showError("phone") && <p className="mt-1 pl-1 text-[11px] font-bold text-red-400">{fieldErrors.phone}</p>}
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceFields((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-xs font-bold text-accent"
              >
                ¿Quieres tu boleta o factura por correo? (opcional)
                {showInvoiceFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showInvoiceFields && (
                <>
                  <div>
                    <input
                      type="email"
                      placeholder="Correo (opcional, para tu boleta)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => markTouched("email")}
                      className={fieldClass("email")}
                    />
                    {showError("email") && <p className="mt-1 pl-1 text-[11px] font-bold text-red-400">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="DNI o RUC (opcional)"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      onBlur={() => markTouched("docNumber")}
                      className={fieldClass("docNumber")}
                    />
                    {showError("docNumber") && (
                      <p className="mt-1 pl-1 text-[11px] font-bold text-red-400">{fieldErrors.docNumber}</p>
                    )}
                  </div>
                  <p className="text-[11px] text-fg-muted">
                    Con tu correo te enviamos la boleta/factura electrónica directo, sin papel.
                  </p>
                </>
              )}
            </div>
            {attempted && hasFieldErrors && (
              <p className="text-xs font-bold text-red-400">Revisa los campos marcados en rojo.</p>
            )}
            {error && <p className="text-xs font-bold text-red-400">{error}</p>}
            <button
              onClick={handleCheckout}
              disabled={isSubmitting || (attempted && hasFieldErrors)}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-accent py-4 text-sm font-black text-accent-fg transition-transform active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <MessageCircle size={20} />}
              Pedir por WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
}
