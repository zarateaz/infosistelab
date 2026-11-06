"use client";

import { useState, useMemo } from "react";
import {
  Pencil,
  List,
  LayoutGrid,
  Search,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Barcode,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CategoryIcon } from "@/components/tienda/categoryIcons";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { DeleteProductButton } from "./DeleteProductButton";
import { deleteProduct, type AdminProduct } from "./actions";
import { ProductShareModal } from "./ProductShareModal";
import { SellProductModal } from "./SellProductModal";

type ViewMode = "list" | "grid";
type SortOption = "itemNumber_asc" | "itemNumber_desc" | "name_asc" | "price_asc" | "price_desc" | "stock_asc";
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

export function ProductsView({ products }: { products: AdminProduct[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("itemNumber_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sharingProduct, setSharingProduct] = useState<AdminProduct | null>(null);
  const [sellingProduct, setSellingProduct] = useState<AdminProduct | null>(null);

  // Lista única de categorías con su cantidad de productos
  const categoriesWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  // Filtrado y búsqueda
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filtro de categoría
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }

      // Filtro de stock
      if (stockFilter === "in_stock" && p.stock <= 0) return false;
      if (stockFilter === "low_stock" && (p.stock <= 0 || p.stock > 3)) return false;
      if (stockFilter === "out_of_stock" && p.stock > 0) return false;

      // Filtro de búsqueda
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(query);
        const matchCat = p.category.toLowerCase().includes(query);
        const matchBarcode = p.barcode?.toLowerCase().includes(query);
        const matchNumber = `#${p.itemNumber}`.includes(query) || String(p.itemNumber) === query;
        if (!matchName && !matchCat && !matchBarcode && !matchNumber) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, stockFilter, search]);

  // Ordenación
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case "itemNumber_asc":
        return list.sort((a, b) => a.itemNumber - b.itemNumber);
      case "itemNumber_desc":
        return list.sort((a, b) => b.itemNumber - a.itemNumber);
      case "name_asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "price_asc":
        return list.sort((a, b) => a.price - b.price);
      case "price_desc":
        return list.sort((a, b) => b.price - a.price);
      case "stock_asc":
        return list.sort((a, b) => a.stock - b.stock);
      default:
        return list;
    }
  }, [filteredProducts, sortBy]);

  // Paginación
  const totalPages = Math.ceil(sortedProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    if (pageSize >= 9999) return sortedProducts;
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda, Filtros y Controles Superiores */}
      <div className="admin-glass rounded-[var(--radius-lg)] p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nombre, código de barra, #Nº o categoría..."
              className="admin-field w-full rounded-xl pl-10 pr-9 py-2 text-sm text-fg"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Selector de Orden y Selector de Vista */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="admin-field rounded-xl px-3 py-2 text-xs font-bold text-fg cursor-pointer pr-7 appearance-none"
              >
                <option value="itemNumber_asc">Nº Menor a Mayor</option>
                <option value="itemNumber_desc">Nº Mayor a Menor</option>
                <option value="name_asc">Nombre (A - Z)</option>
                <option value="price_asc">Precio (Menor a Mayor)</option>
                <option value="price_desc">Precio (Mayor a Menor)</option>
                <option value="stock_asc">Stock (Menor a Mayor)</option>
              </select>
              <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
            </div>

            <div className="inline-flex items-center rounded-xl border border-border/80 bg-bg-surface p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="Ver como lista"
                className={`flex h-7 w-8 items-center justify-center rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-accent text-accent-fg shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Ver como cuadrícula"
                className={`flex h-7 w-8 items-center justify-center rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-accent text-accent-fg shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Píldoras Horizontales de Categorías (con scroll táctil suave en móviles) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar touch-pan-x">
          <button
            type="button"
            onClick={() => handleCategoryChange("all")}
            className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-bold transition-all active:scale-95 ${
              selectedCategory === "all"
                ? "bg-accent text-white shadow-sm"
                : "border border-border/60 bg-bg-surface/80 text-fg-muted hover:border-accent hover:text-accent"
            }`}
          >
            Todas ({products.length})
          </button>
          {categoriesWithCounts.map(([cat, count]) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all active:scale-95 ${
                selectedCategory === cat
                  ? "bg-accent text-white shadow-sm"
                  : "border border-border/60 bg-bg-surface/80 text-fg-muted hover:border-accent hover:text-accent"
              }`}
            >
              <CategoryIcon category={cat} size={13} strokeWidth={2} />
              <span>{cat}</span>
              <span className="opacity-70 text-[10px]">({count})</span>
            </button>
          ))}
        </div>

        {/* Filtros de estado de stock rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-xs text-fg-muted">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-fg">Estado:</span>
            <button
              type="button"
              onClick={() => { setStockFilter("all"); setCurrentPage(1); }}
              className={`rounded-lg px-2.5 py-0.5 font-bold transition-colors ${
                stockFilter === "all" ? "bg-fg/10 text-fg" : "text-fg-muted hover:text-fg"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => { setStockFilter("in_stock"); setCurrentPage(1); }}
              className={`rounded-lg px-2.5 py-0.5 font-bold transition-colors ${
                stockFilter === "in_stock" ? "bg-emerald-500/10 text-emerald-600" : "text-fg-muted hover:text-emerald-600"
              }`}
            >
              En stock
            </button>
            <button
              type="button"
              onClick={() => { setStockFilter("low_stock"); setCurrentPage(1); }}
              className={`rounded-lg px-2.5 py-0.5 font-bold transition-colors ${
                stockFilter === "low_stock" ? "bg-amber-500/10 text-amber-600" : "text-fg-muted hover:text-amber-600"
              }`}
            >
              Stock bajo (≤3)
            </button>
            <button
              type="button"
              onClick={() => { setStockFilter("out_of_stock"); setCurrentPage(1); }}
              className={`rounded-lg px-2.5 py-0.5 font-bold transition-colors ${
                stockFilter === "out_of_stock" ? "bg-red-500/10 text-red-600" : "text-fg-muted hover:text-red-600"
              }`}
            >
              Agotados
            </button>
          </div>

          <span className="text-[11px] font-medium text-fg-muted">
            Mostrando {sortedProducts.length} de {products.length} productos
          </span>
        </div>
      </div>

      {/* Contenido: Tabla Limpia o Cuadrícula */}
      {viewMode === "list" ? (
        <div className="overflow-x-auto admin-glass rounded-[var(--radius-lg)] shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
                <th className="px-4 py-3 w-16">Nº</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedProducts.map((p) => {
                const isOutOfStock = p.stock === 0;
                const isLowStock = p.stock > 0 && p.stock <= 3;

                return (
                  <tr
                    key={p.id}
                    className="group transition-colors hover:bg-bg-raised/60"
                  >
                    {/* Número de ítem */}
                    <td className="px-4 py-3 text-fg-muted font-mono text-xs font-bold">
                      <span className="inline-block rounded-md bg-fg/5 px-1.5 py-0.5">
                        #{p.itemNumber}
                      </span>
                    </td>

                    {/* Producto: Imagen + Nombre + Barcode */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-bg-surface shadow-sm">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <CategoryIcon
                              category={p.category}
                              size={22}
                              strokeWidth={1.5}
                              className="text-fg-muted opacity-40"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-fg text-sm line-clamp-2 leading-tight">
                            {p.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {p.barcode && (
                              <span className="inline-flex items-center gap-1 rounded bg-bg-alt px-1.5 py-0.5 font-mono text-[10px] text-fg-muted border border-border/60">
                                <Barcode size={11} /> {p.barcode}
                              </span>
                            )}
                            {p.costPrice && p.costPrice > 0 && (
                              <span className="text-[10px] text-fg-muted">
                                Costo: S/. {p.costPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-bg-surface/80 px-2.5 py-1 text-xs font-semibold text-fg">
                        <CategoryIcon category={p.category} size={12} strokeWidth={2} />
                        <span className="truncate max-w-[130px]">{p.category}</span>
                      </span>
                    </td>

                    {/* Precio */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <span className="font-display font-extrabold text-fg text-sm">
                          S/. {p.price.toFixed(2)}
                        </span>
                        {p.onSale && p.salePrice && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            <Sparkles size={11} />
                            <span>Oferta: S/. {p.salePrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          isOutOfStock
                            ? "bg-red-500/10 text-red-600 border-red-500/30"
                            : isLowStock
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isOutOfStock
                              ? "bg-red-500"
                              : isLowStock
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        {isOutOfStock ? "Agotado" : `${p.stock} unid.`}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSellingProduct(p)}
                          disabled={p.stock <= 0}
                          aria-label={`Registrar venta de ${p.name}`}
                          title={p.stock <= 0 ? "Sin stock" : "Registrar venta en tienda física"}
                          className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-[11px] font-bold text-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <ShoppingBag size={13} />
                          <span>Vender</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSharingProduct(p)}
                          aria-label={`Compartir ${p.name}`}
                          title="Compartir por WhatsApp o ver galería"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white shadow-sm"
                        >
                          <WhatsAppIcon size={14} />
                        </button>
                        <Link
                          href={`/taller-control/productos/${p.id}`}
                          aria-label={`Editar ${p.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-bg-surface text-fg-muted transition-colors hover:border-accent hover:text-accent hover:bg-bg-alt shadow-sm"
                        >
                          <Pencil size={14} />
                        </Link>
                        <DeleteProductButton productName={p.name} action={() => deleteProduct(p.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-fg-muted">
                    <p className="font-bold text-fg">No se encontraron productos con los filtros seleccionados.</p>
                    <p className="mt-1 text-xs">Prueba cambiando la categoría o término de búsqueda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Vista en Cuadrícula (Cards) */
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {paginatedProducts.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-bg-surface/90 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="relative aspect-square w-full bg-bg-alt/50 overflow-hidden">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <CategoryIcon category={p.category} size={36} strokeWidth={1.5} className="text-fg-muted opacity-30" />
                  </div>
                )}

                {/* Badge de Stock en la foto */}
                <div className="absolute left-2 top-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase shadow-sm ${
                      p.stock === 0
                        ? "bg-red-600 text-white"
                        : p.stock <= 3
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {p.stock === 0 ? "Agotado" : `${p.stock} u.`}
                  </span>
                </div>

                {/* Badge de número de ítem */}
                <div className="absolute right-2 top-2">
                  <span className="rounded-md bg-slate-900/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-sm">
                    #{p.itemNumber}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-3.5">
                <p className="line-clamp-2 text-xs font-bold text-fg leading-snug">
                  {p.name}
                </p>
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                  {p.category}
                </p>

                <div className="mt-auto pt-3 flex items-baseline justify-between">
                  <span className="font-display text-base font-black text-fg">
                    S/. {p.price.toFixed(2)}
                  </span>
                  {p.onSale && p.salePrice && (
                    <span className="text-[10px] font-bold text-blue-600">
                      S/. {p.salePrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2.5">
                  <button
                    type="button"
                    onClick={() => setSellingProduct(p)}
                    disabled={p.stock <= 0}
                    aria-label={`Registrar venta de ${p.name}`}
                    title={p.stock <= 0 ? "Sin stock" : "Registrar venta en tienda física"}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-accent text-xs font-bold text-accent-fg shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ShoppingBag size={13} />
                    <span>{p.stock <= 0 ? "Sin stock" : "Vender"}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/taller-control/productos/${p.id}`}
                      aria-label={`Editar ${p.name}`}
                      className="flex h-8 flex-1 items-center justify-center gap-1 rounded-xl border border-border/60 bg-bg-alt text-xs font-bold text-fg-muted transition-colors hover:border-accent hover:text-accent hover:bg-bg"
                    >
                      <Pencil size={13} />
                      <span>Editar</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setSharingProduct(p)}
                      aria-label={`Compartir ${p.name}`}
                      title="Compartir por WhatsApp o ver galería"
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-sm active:scale-95"
                    >
                      <WhatsAppIcon size={13} />
                      <span>Compartir</span>
                    </button>

                    <DeleteProductButton productName={p.name} action={() => deleteProduct(p.id)} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {paginatedProducts.length === 0 && (
            <div className="col-span-full admin-glass rounded-[var(--radius-lg)] p-12 text-center text-fg-muted">
              <p className="font-bold text-fg">No se encontraron productos.</p>
              <p className="mt-1 text-xs">Intenta cambiar la categoría o término de búsqueda.</p>
            </div>
          )}
        </div>
      )}

      {/* Controles de Paginación */}
      {sortedProducts.length > pageSize && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="admin-field rounded-lg px-2 py-1 text-xs font-bold text-fg"
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={99999}>Todos ({sortedProducts.length})</option>
            </select>
            <span>productos</span>
          </div>

          <div className="flex items-center gap-2 self-center sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-8 items-center gap-1 rounded-xl border border-border/80 bg-bg-surface px-3 text-xs font-bold text-fg transition-colors hover:bg-bg-alt disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="text-xs font-semibold text-fg-muted px-2">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-8 items-center gap-1 rounded-xl border border-border/80 bg-bg-surface px-3 text-xs font-bold text-fg transition-colors hover:bg-bg-alt disabled:opacity-40"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal interactivo de Compartir y Galería */}
      {sharingProduct && (
        <ProductShareModal
          product={sharingProduct}
          onClose={() => setSharingProduct(null)}
        />
      )}

      {/* Modal de venta de mostrador */}
      {sellingProduct && (
        <SellProductModal
          product={sellingProduct}
          onClose={() => setSellingProduct(null)}
        />
      )}
    </div>
  );
}
