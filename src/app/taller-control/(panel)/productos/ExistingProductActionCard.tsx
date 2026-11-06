"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Plus,
  Minus,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  ExternalLink,
} from "lucide-react";
import type { ProductSummary } from "@/lib/duplicateDetection";
import type { ScanFill } from "./ScannerPanel";
import { adjustProductStock } from "./actions";

interface ExistingProductActionCardProps {
  product: ProductSummary;
  onFill?: (fill: ScanFill) => void;
  onStockUpdated?: (newStock: number) => void;
  onPlannedStockChange?: (plannedTotalStock: number) => void;
  onDismissExisting?: () => void;
}

export function ExistingProductActionCard({
  product,
  onStockUpdated,
  onPlannedStockChange,
  onDismissExisting,
}: ExistingProductActionCardProps) {
  const router = useRouter();
  const [currentStock, setCurrentStock] = useState<number>(product.stock ?? 0);
  const [addAmount, setAddAmount] = useState<number>(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sync when product prop changes
  const [trackedProductId, setTrackedProductId] = useState(product.id);
  if (product.id !== trackedProductId) {
    setTrackedProductId(product.id);
    setCurrentStock(product.stock ?? 0);
    setAddAmount(1);
    setFeedback(null);
  }

  const priceFormatted =
    product.price !== undefined ? `S/. ${Number(product.price).toFixed(2)}` : "No def.";
  const costFormatted =
    product.costPrice !== undefined && product.costPrice !== null
      ? `S/. ${Number(product.costPrice).toFixed(2)}`
      : "S/. 0.00";

  function handleSelectAddAmount(amount: number) {
    const valid = Math.max(1, amount);
    setAddAmount(valid);
    onPlannedStockChange?.(currentStock + valid);
  }

  async function handleSaveAddedStock(delta: number) {
    if (delta === 0) return;
    setIsUpdating(true);
    setFeedback(null);
    try {
      const res = await adjustProductStock(product.id, delta);
      if (res.success && res.newStock !== undefined) {
        setCurrentStock(res.newStock);
        onStockUpdated?.(res.newStock);
        onPlannedStockChange?.(res.newStock + addAmount);
        setFeedback(
          delta > 0
            ? `¡Guardado! Se agregaron +${delta} u. al inventario (Nuevo stock en tienda: ${res.newStock} u.).`
            : `Stock ajustado en ${delta} u. (Nuevo stock en tienda: ${res.newStock} u.).`
        );
        router.refresh();
      } else {
        setFeedback(res.error || "Error al actualizar stock.");
      }
    } catch {
      setFeedback("Error de conexión al actualizar stock.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border-2 border-amber-500/60 bg-amber-50/90 p-4 shadow-md transition-all animate-in fade-in duration-200">
      {/* Encabezado de alerta clara */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-amber-500/25 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
            <AlertTriangle size={16} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Producto ya registrado
              </span>
              <h3 className="text-sm font-extrabold text-amber-950">
                ¡Este producto ya se encuentra en la tienda!
              </h3>
            </div>
            <p className="mt-0.5 text-xs font-medium text-amber-900/85">
              Para evitar productos repetidos, elige cuántas unidades deseas agregar al stock y pulsa{" "}
              <strong>Guardar</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onDismissExisting && (
            <button
              type="button"
              onClick={onDismissExisting}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-600/40 bg-white px-2.5 py-1 text-xs font-bold text-amber-950 shadow-2xs transition-colors hover:bg-amber-100/70"
            >
              <span>Registrar como producto nuevo</span>
            </button>
          )}

          <Link
            href={`/taller-control/productos/${product.id}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-600/30 bg-white px-2.5 py-1 text-xs font-bold text-[#0a5fdb] shadow-2xs transition-colors hover:bg-amber-50"
          >
            <Edit3 size={12} />
            <span>Editar ficha completa</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      {/* Datos del producto encontrado */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-white p-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {product.image ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <Image
                src={product.image}
                alt={product.name}
                fill
                unoptimized
                sizes="48px"
                className="object-contain p-1"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
              <Package size={20} strokeWidth={1.5} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-extrabold text-[#0b1230]" title={product.name}>
              {product.name}
            </h4>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              {product.category && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
                  {product.category}
                </span>
              )}
              {product.barcode && (
                <span>
                  Cód: <strong className="font-mono text-[#0b1230]">{product.barcode}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chips de Precio, Costo y Stock Actual */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Precio
            </span>
            <span className="text-xs font-black text-[#0a5fdb]">{priceFormatted}</span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Costo
            </span>
            <span className="text-xs font-bold text-slate-700">{costFormatted}</span>
          </div>

          <div className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">
              Stock actual
            </span>
            <span className="text-xs font-black text-emerald-700">{currentStock} u.</span>
          </div>
        </div>
      </div>

      {/* Selector de Agregar Stock + Botón Guardar */}
      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold text-[#0b1230]">¿Cuánto stock deseas agregar?</span>
          <div className="flex items-center gap-1">
            {[1, 2, 5, 10].map((num) => (
              <button
                key={`preset-${num}`}
                type="button"
                disabled={isUpdating}
                onClick={() => handleSelectAddAmount(num)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                  addAmount === num
                    ? "border-[#0a5fdb] bg-[#0a5fdb] text-white shadow-xs"
                    : "border-slate-300 bg-white text-slate-700 hover:border-[#0a5fdb] hover:text-[#0a5fdb]"
                }`}
              >
                +{num}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={isUpdating || addAmount <= 1}
              onClick={() => handleSelectAddAmount(addAmount - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-[#0a5fdb] disabled:opacity-40"
              title="Menos"
            >
              <Minus size={12} />
            </button>
            <input
              type="number"
              min={1}
              value={addAmount}
              onChange={(e) => handleSelectAddAmount(parseInt(e.target.value, 10) || 1)}
              className="h-7 w-14 rounded-lg border-2 border-slate-300 bg-white px-1 text-center text-xs font-extrabold text-[#0b1230] outline-none focus:border-[#0a5fdb]"
            />
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleSelectAddAmount(addAmount + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-[#0a5fdb] disabled:opacity-40"
              title="Más"
            >
              <Plus size={12} />
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-600">
            Nuevo total:{" "}
            <strong className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
              {currentStock + addAmount} u.
            </strong>
          </span>
        </div>

        <button
          type="button"
          disabled={isUpdating}
          onClick={() => handleSaveAddedStock(addAmount)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
        >
          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>Agregar +{addAmount} u. y Guardar</span>
        </button>
      </div>

      {feedback && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
