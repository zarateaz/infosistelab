"use client";

import Image from "next/image";
import { ShoppingCart, Star } from "lucide-react";
import { CategoryIcon } from "@/components/tienda/categoryIcons";
import type { Product } from "@/types";

export function ProductCard({
  product,
  onSelect,
  onAddToCart,
}: {
  product: Product;
  onSelect: () => void;
  onAddToCart: (p: Product) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-bg-alt transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10"
    >
      <div
        style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden" }}
        className="relative aspect-square overflow-hidden bg-bg"
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            unoptimized
            style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CategoryIcon category={product.category} size={40} strokeWidth={1.25} className="text-fg-muted opacity-40" />
          </div>
        )}

        {product.stock === 0 ? (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-neutral-900/85 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
            Agotado
          </div>
        ) : product.isFeatured ? (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[9px] font-black text-accent-fg">
            <Star size={9} fill="currentColor" /> TOP
          </div>
        ) : product.onSale ? (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
            Oferta
          </div>
        ) : null}

        {product.stock > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            aria-label="Añadir al carrito"
            className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-fg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shadow-lg transition-all active:scale-90"
          >
            <ShoppingCart size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <span className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-fg-muted">
          {product.category}
        </span>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-fg">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          {product.onSale && product.salePrice ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-accent">S/. {product.salePrice.toFixed(2)}</span>
              <span className="text-xs text-fg-muted line-through">S/. {product.price.toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-base font-black text-fg">S/. {product.price.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
