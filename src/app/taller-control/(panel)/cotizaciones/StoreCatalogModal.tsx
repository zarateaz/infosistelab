"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Search,
  ShoppingBag,
  X,
  Check,
  Package,
  Plus,
  Minus,
  Sparkles,
  Layers,
  ArrowRight,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { searchCatalogProducts, type CatalogProductResult } from "./actions";

export interface SelectedCatalogItem {
  product: CatalogProductResult;
  quantity: number;
}

interface StoreCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: CatalogProductResult) => void;
  onAddMultipleProducts?: (selected: SelectedCatalogItem[]) => void;
  currencySymbol?: string;
  targetItemIndex?: number | null;
}

export function StoreCatalogModal({
  isOpen,
  onClose,
  onSelectProduct,
  onAddMultipleProducts,
  currencySymbol = "S/.",
  targetItemIndex = null,
}: StoreCatalogModalProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<CatalogProductResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [isPending, startTransition] = useTransition();

  // Multi-selection map: { [productId]: { product, quantity } }
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectedCatalogItem>>({});
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Load products on open or query change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await searchCatalogProducts(query);
          setProducts(res || []);
        } catch {
          setProducts([]);
        }
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, query]);

  // Reset local state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedMap({});
      setJustAddedId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract unique categories
  const categories = [
    "TODAS",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[])),
  ];

  const filteredProducts =
    selectedCategory === "TODAS"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  // Selection helpers
  const selectedList = Object.values(selectedMap);
  const selectedCount = selectedList.length;
  const totalUnits = selectedList.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalEstimatedAmount = selectedList.reduce(
    (acc, curr) => acc + curr.product.price * curr.quantity,
    0
  );

  const toggleProduct = (product: CatalogProductResult) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        next[product.id] = { product, quantity: 1 };
      }
      return next;
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedMap((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: { ...existing, quantity: newQty },
      };
    });
  };

  const handleSingleSelectImmediate = (product: CatalogProductResult) => {
    setJustAddedId(product.id);
    if (onSelectProduct) {
      onSelectProduct(product);
    } else if (onAddMultipleProducts) {
      onAddMultipleProducts([{ product, quantity: 1 }]);
    }
    setTimeout(() => {
      setJustAddedId(null);
      onClose();
    }, 300);
  };

  const handleConfirmMultiple = () => {
    if (selectedList.length === 0) return;
    if (onAddMultipleProducts) {
      onAddMultipleProducts(selectedList);
    } else if (onSelectProduct && selectedList.length === 1) {
      onSelectProduct(selectedList[0].product);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-3xl border border-border/80 bg-bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border bg-bg-alt/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-black text-fg">
                  Catálogo de Productos de la Tienda
                </h3>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                  {filteredProducts.length} disponibles
                </span>
                <span className="hidden sm:inline-flex rounded-full bg-accent/15 border border-accent/30 px-2.5 py-0.5 text-[11px] font-black text-accent">
                  ✨ Selección Múltiple Activa
                </span>
              </div>
              <p className="text-xs text-fg-muted mt-0.5">
                {targetItemIndex !== null
                  ? `Elige el producto para el Ítem #${targetItemIndex + 1} o selecciona varios para agregarlos todos a la vez.`
                  : "Selecciona uno o varios productos para agregarlos en lote a la cotización con fotos, precios y especificaciones automáticas."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleConfirmMultiple}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-black shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-95"
              >
                <span>Insertar ({selectedCount})</span>
                <ArrowRight size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-fg-muted hover:bg-fg/5 hover:text-fg transition-colors"
              title="Cerrar catálogo"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search bar & Category filters */}
        <div className="p-4 border-b border-border bg-bg-surface space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              autoFocus
              placeholder="Escribe para buscar: ej. mouse, combo teros, teclado, pantalla, laptop, cable, disco..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="admin-field w-full rounded-2xl pl-11 pr-24 py-2.5 text-xs sm:text-sm font-semibold text-fg h-12 shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-fg-muted hover:text-fg font-black bg-bg-alt px-2.5 py-1 rounded-lg"
              >
                Limpiar
              </button>
            )}
          </div>

          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <Layers size={14} className="text-fg-muted shrink-0 ml-1" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-accent text-accent-fg shadow-xs scale-[1.02]"
                      : "bg-bg-alt text-fg-muted hover:text-fg hover:bg-bg-alt/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isPending && products.length === 0 ? (
            <div className="py-20 text-center text-fg-muted text-xs flex flex-col items-center gap-2">
              <Sparkles size={28} className="animate-spin text-accent" />
              <span className="font-bold text-sm">Cargando inventario de la tienda…</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-fg-muted text-xs space-y-2">
              <Package size={42} className="mx-auto opacity-30" />
              <p className="font-bold text-base text-fg">No se encontraron productos con &quot;{query}&quot;</p>
              <p>Intenta con otra palabra clave o agrega el ítem manualmente en la cotización.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const selectedItem = selectedMap[p.id];
                const isSelected = Boolean(selectedItem);
                const isJustAdded = justAddedId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 bg-bg hover:shadow-xl ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 ring-2 ring-emerald-500/40 shadow-md"
                        : "border-border/70 hover:border-accent/50"
                    }`}
                  >
                    <div>
                      {/* Product image & badges */}
                      <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-border/50 flex items-center justify-center p-2.5">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 text-fg-muted/40">
                            <Package size={36} />
                            <span className="text-[10px] font-medium">Sin imagen</span>
                          </div>
                        )}

                        {/* Top Selection Checkbox / Badge */}
                        <button
                          type="button"
                          onClick={() => toggleProduct(p)}
                          className={`absolute top-2.5 right-2.5 h-7 w-7 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500 text-white scale-110"
                              : "bg-black/50 text-white/70 hover:bg-black/70 hover:text-white"
                          }`}
                          title={isSelected ? "Quitar de la selección" : "Seleccionar para agregar"}
                        >
                          {isSelected ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
                        </button>

                        {/* Stock badge */}
                        <span
                          className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            p.stock > 0
                              ? "bg-emerald-500/90 text-white shadow-xs"
                              : "bg-rose-500/90 text-white"
                          }`}
                        >
                          {p.stock > 0 ? `Stock: ${p.stock}` : "Agotado"}
                        </span>

                        {p.category && (
                          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 backdrop-blur-xs text-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            {p.category}
                          </span>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="mt-3.5">
                        <h4 className="font-black text-xs sm:text-sm text-fg leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                          {p.name}
                        </h4>
                        {p.description && (
                          <p className="mt-1 text-[11px] text-fg-muted line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pricing & Selection Actions */}
                    <div className="mt-4 pt-3.5 border-t border-border/60">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-fg-muted">
                            Precio de Venta
                          </div>
                          <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            {currencySymbol} {p.price.toFixed(2)}
                          </div>
                        </div>

                        {p.costPrice ? (
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                              Costo Compra
                            </div>
                            <div className="text-xs font-bold text-fg-muted">
                              {currencySymbol} {p.costPrice.toFixed(2)}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Controls depending on whether item is selected or not */}
                      {isSelected ? (
                        <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                          <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 pl-1.5 flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            <span>Seleccionado</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(p.id, -1)}
                              className="h-7 w-7 rounded-lg bg-bg-surface hover:bg-fg/10 text-fg flex items-center justify-center transition-colors font-bold"
                              title="Restar 1 unidad"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-8 text-center text-xs font-black text-fg">
                              {selectedItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(p.id, 1)}
                              className="h-7 w-7 rounded-lg bg-bg-surface hover:bg-fg/10 text-fg flex items-center justify-center transition-colors font-bold"
                              title="Sumar 1 unidad"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => toggleProduct(p)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 py-2 text-xs font-black transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xs"
                          >
                            <Plus size={14} />
                            <span>Seleccionar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSingleSelectImmediate(p)}
                            disabled={isJustAdded}
                            className={`inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer ${
                              isJustAdded
                                ? "bg-emerald-500 text-white"
                                : "bg-accent text-accent-fg hover:bg-accent-hover hover:shadow-md"
                            }`}
                          >
                            {isJustAdded ? (
                              <>
                                <Check size={14} />
                                <span>¡Listo!</span>
                              </>
                            ) : (
                              <span>Cotizar solo este</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Multi-Product Selection Drawer (appears if 1 or more items selected) */}
        {selectedCount > 0 ? (
          <div className="px-6 py-4 border-t-2 border-emerald-500/40 bg-emerald-500/10 dark:bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 font-black text-sm">
                {selectedCount}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black text-fg flex items-center gap-2">
                  <span>{selectedCount} producto(s) listo(s) para cotizar</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    ({totalUnits} {totalUnits === 1 ? "unidad" : "unidades"} en total)
                  </span>
                </div>
                <div className="text-xs text-fg-muted font-bold">
                  Importe total estimado:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    {currencySymbol} {totalEstimatedAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMap({})}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg-surface px-3 py-2 text-xs font-bold text-fg-muted hover:text-rose-500 hover:border-rose-500/40 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Vaciar</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmMultiple}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
              >
                <span>🚀 Agregar {selectedCount} producto(s) a la Cotización</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Footer when nothing selected */
          <div className="px-6 py-3.5 border-t border-border bg-bg-alt/40 flex items-center justify-between text-xs text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-black">💡 Tip:</span> Puedes hacer clic en &quot;Seleccionar&quot; en varios productos a la vez para insertarlos juntos con todas sus fotos y precios.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="font-black text-fg hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
