"use client";

import Image from "next/image";
import { X, ShoppingCart, Star } from "lucide-react";
import { CategoryIcon } from "@/components/tienda/categoryIcons";
import type { Product } from "@/types";

export function ProductModal({
  product,
  onClose,
  onAddToCart,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        className="max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-bg-alt p-6 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <div className="flex w-full items-center justify-center pb-3 -mt-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-border-strong/40" />
        </div>
        <div className="mb-4 flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
            {product.category}
          </span>
          <button onClick={onClose} className="rounded-full p-2 text-fg-muted transition-colors hover:bg-bg">
            <X size={18} />
          </button>
        </div>

        <div
          style={{ position: "relative", width: "100%", height: "14rem", overflow: "hidden" }}
          className="relative mb-6 h-56 w-full rounded-2xl bg-bg"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
              className="object-contain p-6"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <CategoryIcon category={product.category} size={64} strokeWidth={1.25} className="text-fg-muted opacity-40" />
            </div>
          )}
          {product.isFeatured && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[9px] font-black text-accent-fg">
              <Star size={9} fill="currentColor" /> RECOMENDADO
            </div>
          )}
        </div>

        <h2 className="mb-3 text-2xl font-black leading-tight text-fg">{product.name}</h2>
        <p className="mb-5 text-sm leading-relaxed text-fg-muted">{product.description}</p>

        {product.stock === 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-bold text-red-500">
            <span>⛔ Este producto se encuentra temporalmente agotado.</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-5">
          <div>
            {product.onSale && product.salePrice ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-fg">S/. {product.salePrice.toFixed(2)}</span>
                <span className="text-sm text-fg-muted line-through">S/. {product.price.toFixed(2)}</span>
              </div>
            ) : (
              <span className="text-3xl font-black tracking-tight text-fg">S/. {product.price.toFixed(2)}</span>
            )}
          </div>
          <button
            disabled={product.stock <= 0}
            onClick={() => {
              if (product.stock <= 0) return;
              onAddToCart(product);
              onClose();
            }}
            className="flex items-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm font-black text-accent-fg transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <ShoppingCart size={18} />
            {product.stock <= 0 ? "Agotado" : "Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}
