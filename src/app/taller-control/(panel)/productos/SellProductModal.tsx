"use client";

import { useEffect, useMemo, useState, useTransition, type ComponentType } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Minus,
  Plus,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Loader2,
  MessageCircle,
  ReceiptText,
  Wallet,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from "lucide-react";
import { CategoryIcon } from "@/components/tienda/categoryIcons";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_INFO,
  type PaymentMethodType,
} from "@/lib/paymentMethods";
import {
  buildWhatsAppLink,
  generateSingleProductStockAlertMessage,
} from "@/lib/whatsappStockReport";
import { sellProduct } from "./sell-actions";
import type { AdminProduct } from "./actions";

function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

interface MethodTone {
  icon: ComponentType<{ size?: number | string; className?: string }>;
  active: string;
  iconWrap: string;
  hint: string;
}

const METHOD_TONE: Record<PaymentMethodType, MethodTone> = {
  EFECTIVO: {
    icon: Banknote,
    active: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:bg-emerald-500/10",
    iconWrap: "bg-emerald-500/10 text-emerald-600",
    hint: "Dinero en caja física",
  },
  "YAPE 1": {
    icon: Smartphone,
    active: "border-violet-500 bg-violet-50 ring-2 ring-violet-500/20 dark:bg-violet-500/10",
    iconWrap: "bg-violet-500/10 text-violet-600",
    hint: "Laboratorio INFOSISTEL",
  },
  "YAPE 2": {
    icon: Smartphone,
    active: "border-fuchsia-500 bg-fuchsia-50 ring-2 ring-fuchsia-500/20 dark:bg-fuchsia-500/10",
    iconWrap: "bg-fuchsia-500/10 text-fuchsia-600",
    hint: "Yape Caja",
  },
};

export interface SaleSuccess {
  saleId: string;
  productName: string;
  itemNumber: number;
  quantity: number;
  unitPrice: number;
  total: number;
  profit: number;
  paymentMethod: string;
  remainingStock: number;
  lowStock: boolean;
  reused: boolean;
}

export function SellProductModal({
  product,
  onClose,
}: {
  product: AdminProduct;
  onClose: () => void;
}) {
  const router = useRouter();
  const unitPrice = useMemo(
    () =>
      product.onSale && product.salePrice ? product.salePrice : product.price,
    [product]
  );

  const [availableStock, setAvailableStock] = useState(product.stock);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | "">("");
  const [showDetails, setShowDetails] = useState(false);
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(newRequestId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SaleSuccess | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = useMemo(
    () => Math.round(unitPrice * quantity * 100) / 100,
    [unitPrice, quantity]
  );

  /* Cerrar con Escape, salvo mientras se está registrando la venta. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isPending]);

  /* Bloquear el scroll de la página de fondo mientras el modal está abierto. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const clampQuantity = (value: number) => {
    if (!Number.isFinite(value)) return;
    setQuantity(Math.max(1, Math.min(availableStock, Math.trunc(value))));
  };

  const confirm = () => {
    if (isPending) return;

    if (!paymentMethod) {
      setError("Selecciona el método de pago: Efectivo, Yape 1 o Yape 2.");
      return;
    }
    if (availableStock <= 0) {
      setError("Este producto está agotado.");
      return;
    }
    if (quantity > availableStock) {
      setError(`Solo quedan ${availableStock} unidad(es) disponibles.`);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await sellProduct({
          productId: product.id,
          quantity,
          paymentMethod,
          clientRequestId: requestId,
          clientName: clientName.trim() || undefined,
          note: note.trim() || undefined,
        });

        if (result.error || !result.sale) {
          setError(result.error ?? "No se pudo registrar la venta.");
          return;
        }

        setSuccess(result.sale);
        setAvailableStock(result.sale.remainingStock);
        router.refresh();
      } catch {
        setError(
          "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo; si la venta ya se registró, no se duplicará."
        );
      }
    });
  };

  const startAnotherSale = () => {
    setSuccess(null);
    setError(null);
    setQuantity(1);
    setPaymentMethod("");
    setShowDetails(false);
    setClientName("");
    setNote("");
    setRequestId(newRequestId());
  };

  const notifyLowStock = (remaining: number) => {
    const text = generateSingleProductStockAlertMessage(product.name, remaining);
    window.open(buildWhatsAppLink(text), "_blank", "noopener,noreferrer");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => {
        if (!isPending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sell-product-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-bg-alt shadow-2xl sm:rounded-3xl"
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/25">
              <ShoppingBag size={19} />
            </div>
            <div>
              <h2
                id="sell-product-title"
                className="text-base font-extrabold leading-tight text-fg"
              >
                Registrar venta
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-fg-muted">
                Tienda física · descuenta stock y registra el ingreso en Caja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-bg hover:text-fg disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {success ? (
            <SaleSuccessPanel
              sale={success}
              onClose={onClose}
              onAnother={startAnotherSale}
              onNotify={notifyLowStock}
            />
          ) : (
            <div className="space-y-4">
              {/* Producto */}
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg p-3">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-alt">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <CategoryIcon
                      category={product.category}
                      size={26}
                      className="text-fg-muted opacity-40"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                    #{product.itemNumber} · {product.category}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-fg">
                    {product.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-extrabold text-fg">
                      S/. {unitPrice.toFixed(2)}
                    </span>
                    {product.onSale && product.salePrice && (
                      <span className="text-[10px] font-bold text-fg-muted line-through">
                        S/. {product.price.toFixed(2)}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        availableStock <= 0
                          ? "bg-red-500/10 text-red-600"
                          : availableStock <= 3
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {availableStock <= 0
                        ? "Agotado"
                        : `${availableStock} en stock`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-fg-muted">
                    Cantidad vendida
                  </label>
                  <span className="text-[10px] font-semibold text-fg-muted">
                    Máx. {availableStock}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => clampQuantity(quantity - 1)}
                    disabled={quantity <= 1}
                    aria-label="Restar una unidad"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg-alt text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-35"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, availableStock)}
                    value={quantity}
                    onChange={(event) => clampQuantity(Number(event.target.value))}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg-alt text-center text-lg font-black text-fg outline-none focus:border-accent"
                    aria-label="Cantidad"
                  />
                  <button
                    type="button"
                    onClick={() => clampQuantity(quantity + 1)}
                    disabled={quantity >= availableStock}
                    aria-label="Sumar una unidad"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-bg-alt text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-35"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-fg-muted">
                  Método de pago{" "}
                  <span className="text-red-500" aria-hidden>
                    *
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => {
                    const tone = METHOD_TONE[method];
                    const Icon = tone.icon;
                    const active = paymentMethod === method;
                    const info = PAYMENT_METHOD_INFO[method];
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method);
                          setError(null);
                        }}
                        aria-pressed={active}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all active:scale-[0.98] ${
                          active
                            ? tone.active
                            : "border-border bg-bg-alt hover:border-border-strong"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone.iconWrap}`}
                        >
                          <Icon size={15} />
                        </span>
                        <span className="text-xs font-extrabold text-fg">
                          {info.name}
                        </span>
                        <span className="line-clamp-1 text-[9px] font-semibold text-fg-muted">
                          {tone.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {paymentMethod && (
                  <p className="mt-1.5 text-[10px] font-semibold text-fg-muted">
                    Cuenta: {PAYMENT_METHOD_INFO[paymentMethod].titular}
                    {PAYMENT_METHOD_INFO[paymentMethod].formattedPhone
                      ? ` · ${PAYMENT_METHOD_INFO[paymentMethod].formattedPhone}`
                      : ""}
                  </p>
                )}
              </div>

              {/* Descripción automática (la escribe el sistema, no el usuario) */}
              <div className="rounded-xl border border-border bg-bg px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-fg-muted">
                  Descripción automática
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs font-bold text-fg">
                  {product.name}
                  {quantity > 1 ? ` (x${quantity})` : ""}
                </p>
              </div>

              {/* Datos opcionales, ocultos por defecto */}
              <button
                type="button"
                onClick={() => setShowDetails((value) => !value)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-bg-alt px-3 py-2 text-[11px] font-bold text-fg-muted transition-colors hover:text-fg"
              >
                <span className="flex items-center gap-1.5">
                  <StickyNote size={13} />
                  Agregar cliente o nota (opcional)
                </span>
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDetails && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Cliente (opcional)"
                    className="w-full rounded-xl border border-border bg-bg-alt px-3.5 py-2.5 text-xs font-semibold text-fg outline-none placeholder:font-normal placeholder:text-fg-muted focus:border-accent"
                  />
                  <input
                    type="text"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Nota (opcional)"
                    className="w-full rounded-xl border border-border bg-bg-alt px-3.5 py-2.5 text-xs font-semibold text-fg outline-none placeholder:font-normal placeholder:text-fg-muted focus:border-accent"
                  />
                </div>
              )}

              {/* Resumen */}
              <div className="rounded-2xl border border-border bg-bg p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-fg-muted">
                  <span>
                    {quantity} × S/. {unitPrice.toFixed(2)}
                  </span>
                  <span>Stock restante: {availableStock - quantity}</span>
                </div>
                <div className="mt-1.5 flex items-end justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-fg-muted">
                    Total a cobrar
                  </span>
                  <span className="font-display text-2xl font-black tracking-tight text-fg">
                    S/. {total.toFixed(2)}
                  </span>
                </div>
                {paymentMethod && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <Wallet size={11} />
                    Se registrará un ingreso en Caja ·{" "}
                    {PAYMENT_METHOD_INFO[paymentMethod].name}
                  </p>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-600"
                >
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!success && (
          <div className="border-t border-border bg-bg-alt px-5 py-3.5">
            <button
              type="button"
              onClick={confirm}
              disabled={isPending || !paymentMethod || availableStock <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-black text-accent-fg shadow-lg shadow-accent/20 transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isPending ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Registrando venta…
                </>
              ) : (
                <>
                  <ReceiptText size={17} />
                  Confirmar venta · S/. {total.toFixed(2)}
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[10px] font-medium text-fg-muted">
              Se descontará stock y se creará el ingreso en Caja en una sola
              operación.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function SaleSuccessPanel({
  sale,
  onClose,
  onAnother,
  onNotify,
}: {
  sale: SaleSuccess;
  onClose: () => void;
  onAnother: () => void;
  onNotify: (remaining: number) => void;
}) {
  const methodLabel =
    PAYMENT_METHOD_INFO[sale.paymentMethod as PaymentMethodType]?.name ??
    sale.paymentMethod;

  return (
    <div className="py-2">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 size={38} />
        </div>
        <h3 className="mt-3 text-lg font-black text-fg">Venta registrada</h3>
        <p className="mt-1 max-w-sm text-xs font-medium text-fg-muted">
          El stock se actualizó y el ingreso ya está en Caja
          {sale.reused
            ? " (esta venta ya se había registrado; no se duplicó)."
            : "."}
        </p>
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-border bg-bg p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-fg-muted">Producto</span>
          <span className="text-right text-xs font-bold text-fg">
            {sale.productName} <span className="text-fg-muted">· x{sale.quantity}</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-fg-muted">Precio unitario</span>
          <span className="text-xs font-bold text-fg">
            S/. {sale.unitPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-fg-muted">Método de pago</span>
          <span className="text-xs font-bold text-fg">{methodLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-fg-muted">Stock restante</span>
          <span
            className={`text-xs font-black ${
              sale.remainingStock <= 0
                ? "text-red-600"
                : sale.remainingStock <= 3
                  ? "text-amber-600"
                  : "text-emerald-600"
            }`}
          >
            {sale.remainingStock} unidad(es)
          </span>
        </div>
        <div className="flex items-end justify-between border-t border-border pt-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-fg-muted">
            Total cobrado
          </span>
          <span className="font-display text-2xl font-black text-fg">
            S/. {sale.total.toFixed(2)}
          </span>
        </div>
      </div>

      {sale.remainingStock <= 1 && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              {sale.remainingStock <= 0
                ? "Producto agotado"
                : "Queda solo 1 unidad"}
            </p>
            <button
              type="button"
              onClick={() => onNotify(sale.remainingStock)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400"
            >
              <MessageCircle size={12} />
              Avisar por WhatsApp
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAnother}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-accent-fg transition-opacity hover:opacity-90"
        >
          Vender otra unidad
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-border bg-bg-alt px-4 py-2.5 text-xs font-bold text-fg-muted transition-colors hover:text-fg"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
