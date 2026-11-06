"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import { Search, PackageX, List, LayoutGrid, MessageCircle, AlertTriangle } from "lucide-react";
import { CategoryIcon } from "@/components/tienda/categoryIcons";
import { SellButton } from "./SellButton";
import type { AdminProduct } from "../productos/actions";
import {
  buildWhatsAppLink,
  generateStockReportMessage,
} from "@/lib/whatsappStockReport";

type StockFilter = "all" | "critical" | "low" | "out";
type ViewMode = "list" | "grid";

// Each variant sets its own `bg-*` — never combine one of these with a
// separate base `bg-bg-alt` on the element. Tailwind utilities of equal
// specificity win by position in the generated stylesheet, not by where
// they sit in the className string, so a base "bg-bg-alt" can silently
// beat "bg-accent" here and leave white text on a white chip (exactly
// what happened: the active "Todos" chip going invisible in production).
const CHIP_TONE = {
  default: "border-border-strong bg-bg-alt text-fg-muted hover:border-accent hover:text-accent",
  active: "border-accent bg-accent text-accent-fg shadow-md shadow-accent/30",
  warn: "border-amber-500/40 bg-bg-alt text-amber-600 hover:border-amber-500 hover:bg-amber-50",
  warnActive: "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/30",
  danger: "border-red-500/40 bg-bg-alt text-red-600 hover:border-red-500 hover:bg-red-50",
  dangerActive: "border-red-600 bg-red-600 text-white shadow-md shadow-red-600/30",
};

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  const btnClass = (active: boolean) =>
    `flex h-8 w-9 items-center justify-center rounded-lg transition-colors ${
      active ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-accent"
    }`;
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border-2 border-border-strong bg-bg-alt p-1">
      <button type="button" onClick={() => onChange("list")} aria-label="Ver como lista" className={btnClass(mode === "list")}>
        <List size={15} />
      </button>
      <button type="button" onClick={() => onChange("grid")} aria-label="Ver en cuadros" className={btnClass(mode === "grid")}>
        <LayoutGrid size={15} />
      </button>
    </div>
  );
}

function ProductGridCard({ p }: { p: AdminProduct }) {
  const badge =
    p.stock === 0 ? (
      <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
        Agotado
      </span>
    ) : p.stock === 1 ? (
      <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-md shadow-amber-500/40 animate-pulse">
        ¡Queda 1!
      </span>
    ) : p.stock <= 3 ? (
      <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
        Stock {p.stock}
      </span>
    ) : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-bg-alt transition-shadow hover:shadow-lg hover:shadow-accent/10">
      <div className="relative aspect-square w-full bg-bg">
        {p.image ? (
          <Image
            src={p.image}
            alt=""
            fill
            sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CategoryIcon category={p.category} size={32} strokeWidth={1.5} className="text-fg-muted opacity-40" />
          </div>
        )}
        {badge}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-fg">#{p.itemNumber} - {p.name}</p>
        <p className="truncate text-[11px] font-bold uppercase tracking-wide text-fg-muted">{p.category}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-fg">S/. {(p.onSale && p.salePrice ? p.salePrice : p.price).toFixed(2)}</span>
          <span className={`text-xs font-bold ${p.stock <= 3 ? "text-red-600" : "text-fg-muted"}`}>{p.stock} u.</span>
        </div>
        <div className="mt-2">
          <SellButton
            productId={p.id}
            productName={p.name}
            stock={p.stock}
            unitPrice={p.onSale && p.salePrice ? p.salePrice : p.price}
          />
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  tone = "default",
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: "default" | "warn" | "danger";
  onClick: () => void;
}) {
  const toneClass = active
    ? tone === "warn"
      ? CHIP_TONE.warnActive
      : tone === "danger"
        ? CHIP_TONE.dangerActive
        : CHIP_TONE.active
    : tone === "warn"
      ? CHIP_TONE.warn
      : tone === "danger"
        ? CHIP_TONE.danger
        : CHIP_TONE.default;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${toneClass}`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-fg/5"}`}>{count}</span>
    </button>
  );
}

export function InventoryTable({ products }: { products: AdminProduct[] }) {
  const [query, setQuery] = useState("");
  // The search box binds to `query` directly so keystrokes never feel
  // delayed; the (heavier) filter + group + 247-row re-render runs off
  // `deferredQuery` instead, which React is free to interrupt/skip ahead
  // on if a newer keystroke arrives before it finishes — the fix for
  // typing feeling laggy without touching what actually renders.
  const deferredQuery = useDeferredValue(query);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const criticalCount = products.filter((p) => p.stock === 1).length;
  const lowStockCount = products.filter((p) => p.stock <= 3 && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  const handleSendWhatsAppReport = () => {
    const alertProducts = products.filter((p) => p.stock <= 3);
    const message = generateStockReportMessage(alertProducts);
    window.open(buildWhatsAppLink(message), "_blank");
  };

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (stockFilter === "critical" && p.stock !== 1) return false;
      if (stockFilter === "low" && !(p.stock <= 3 && p.stock > 0)) return false;
      if (stockFilter === "out" && p.stock !== 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, deferredQuery, stockFilter]);

  // Grouped by category — products already arrives sorted category asc,
  // name asc (see productos/actions.ts's getAdminProducts), so this just
  // labels the existing order instead of re-sorting. Memoized alongside
  // `filtered` so it doesn't redo the grouping pass on renders the filter
  // itself didn't change.
  const groups = useMemo(() => {
    const result: { category: string; items: typeof filtered }[] = [];
    for (const p of filtered) {
      const current = result[result.length - 1];
      if (current && current.category === p.category) current.items.push(p);
      else result.push({ category: p.category, items: [p] });
    }
    return result;
  }, [filtered]);

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, categoría o código..."
            className="admin-field w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-fg"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label="Todos" count={products.length} active={stockFilter === "all"} onClick={() => setStockFilter("all")} />
          <FilterChip
            label="Stock = 1"
            count={criticalCount}
            active={stockFilter === "critical"}
            tone="danger"
            onClick={() => setStockFilter("critical")}
          />
          <FilterChip
            label="Stock bajo (≤3)"
            count={lowStockCount}
            active={stockFilter === "low"}
            tone="warn"
            onClick={() => setStockFilter("low")}
          />
          <FilterChip
            label="Agotado"
            count={outOfStockCount}
            active={stockFilter === "out"}
            tone="danger"
            onClick={() => setStockFilter("out")}
          />
          <button
            type="button"
            onClick={handleSendWhatsAppReport}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-600 bg-emerald-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            title="Enviar reporte completo de stock crítico y bajo al WhatsApp de la empresa"
          >
            <MessageCircle size={14} />
            Mandar a WhatsApp
          </button>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-fg-muted">
        {filtered.length} de {products.length} productos
      </p>

      {viewMode === "list" ? (
      <div className="mt-3 overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
              <th className="px-5 py-3">Nº</th>
              <th className="px-5 py-3">Producto</th>
              <th className="px-5 py-3">Categoría</th>
              <th className="px-5 py-3">Precio</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.category}>
                <tr className="bg-accent/10">
                  <td colSpan={6} className="px-5 py-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-accent">
                      <CategoryIcon category={group.category} size={14} strokeWidth={2} />
                      {group.category}
                      <span className="font-semibold text-accent/70">· {group.items.length}</span>
                    </div>
                  </td>
                </tr>
                {group.items.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 text-fg-muted font-bold">#{p.itemNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg">
                          {p.image ? (
                            <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
                          ) : (
                            <CategoryIcon category={p.category} size={18} strokeWidth={1.5} className="text-fg-muted opacity-50" />
                          )}
                        </div>
                        <span className="font-semibold text-fg">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-fg-muted">{p.category}</td>
                    <td className="px-5 py-3.5 text-fg">
                      S/. {(p.onSale && p.salePrice ? p.salePrice : p.price).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.stock === 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-500">
                          Agotado
                        </span>
                      ) : p.stock === 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-500 animate-pulse">
                          <AlertTriangle size={12} />
                          ¡Queda 1!
                        </span>
                      ) : (
                        <span className={p.stock <= 3 ? "font-bold text-amber-500" : "text-fg"}>
                          {p.stock} u.
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <SellButton
                        productId={p.id}
                        productName={p.name}
                        stock={p.stock}
                        unitPrice={p.onSale && p.salePrice ? p.salePrice : p.price}
                      />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-fg-muted">
                  <div className="flex flex-col items-center gap-2">
                    <PackageX size={28} className="text-fg-muted/50" />
                    <p className="font-semibold">Sin resultados para “{query}”.</p>
                    <p className="text-xs">Prueba con otro nombre, categoría o código de barras.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      ) : (
      <div className="mt-3">
        {groups.map((group) => (
          <div key={group.category} className="mb-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-accent">
              <CategoryIcon category={group.category} size={14} strokeWidth={2} />
              {group.category}
              <span className="font-semibold text-accent/70">· {group.items.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {group.items.map((p) => (
                <ProductGridCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="admin-glass flex flex-col items-center gap-2 rounded-[var(--radius-lg)] py-14 text-center text-fg-muted">
            <PackageX size={28} className="text-fg-muted/50" />
            <p className="font-semibold">Sin resultados para “{query}”.</p>
            <p className="text-xs">Prueba con otro nombre, categoría o código de barras.</p>
          </div>
        )}
      </div>
      )}
    </>
  );
}
