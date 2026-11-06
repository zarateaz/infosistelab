"use client";

import { useState } from "react";
import { Plus, X, Package, AlertTriangle, XCircle, DollarSign } from "lucide-react";
import type { AdminProduct, ProductFormState } from "./actions";
import { ProductForm } from "./ProductForm";
import { ProductsView } from "./ProductsView";

interface ProductsManagerProps {
  products: AdminProduct[];
  categoryNames: string[];
  createProductAction: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
}

export function ProductsManager({
  products,
  categoryNames,
  createProductAction,
}: ProductsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  // Métricas rápidas del inventario
  const totalProducts = products.length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 3).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);

  return (
    <div className="space-y-6">
      {/* Header con título y botón de acción principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-fg">
            Inventario & Productos
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Gestiona tu catálogo completo, existencias, precios y códigos de barras.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-md transition-all active:scale-95 ${
            showAddForm
              ? "bg-slate-800 text-white hover:bg-slate-900 border border-border"
              : "bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-blue-500/25 hover:shadow-lg hover:brightness-105"
          }`}
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? "Cerrar formulario" : "Añadir nuevo producto"}
        </button>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-bg-surface/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Productos</span>
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
              <Package size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-fg">{totalProducts}</p>
          <p className="text-[11px] text-fg-muted mt-0.5">{totalStockUnits} unidades totales</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-bg-surface/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Bajo (≤3)</span>
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className={`mt-2 font-display text-2xl font-black ${lowStock > 0 ? "text-amber-600 dark:text-amber-400" : "text-fg"}`}>
            {lowStock}
          </p>
          <p className="text-[11px] text-fg-muted mt-0.5">Requieren reposición</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-bg-surface/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Agotados</span>
            <div className="rounded-lg bg-red-500/10 p-1.5 text-red-600 dark:text-red-400">
              <XCircle size={16} />
            </div>
          </div>
          <p className={`mt-2 font-display text-2xl font-black ${outOfStock > 0 ? "text-red-600 dark:text-red-400" : "text-fg"}`}>
            {outOfStock}
          </p>
          <p className="text-[11px] text-fg-muted mt-0.5">Sin stock disponible</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-bg-surface/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-fg-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Categorías</span>
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-fg">{categoryNames.length}</p>
          <p className="text-[11px] text-fg-muted mt-0.5">Secciones activas</p>
        </div>
      </div>

      {/* Formulario colapsable para agregar producto */}
      {showAddForm && (
        <div className="rounded-[var(--radius-lg)] border border-accent/40 bg-bg-surface/95 p-6 shadow-xl ring-1 ring-accent/20 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-accent p-2 text-white">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-fg">Nuevo Producto</h2>
                <p className="text-xs text-fg-muted">
                  Completa los datos o usa el escáner con IA para autocompletar.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-alt hover:text-fg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <ProductForm
            categoryNames={categoryNames}
            action={createProductAction}
            showScanner
          />
        </div>
      )}

      {/* Vista y Catálogo Completo de Productos con 100% de Ancho */}
      <div className="w-full">
        <ProductsView products={products} />
      </div>
    </div>
  );
}
