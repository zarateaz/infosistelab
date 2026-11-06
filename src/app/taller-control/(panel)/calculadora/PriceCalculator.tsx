"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Calculator,
  Copy,
  Check,
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  Trash2,
  ArrowUpRight,
  History,
  Search,
} from "lucide-react";

const IGV_RATE = 0.18;
const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";
const inputClass = "admin-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-fg";

type Method = "margen" | "recargo";
type SaleView = "con_igv" | "sin_igv";

interface SavedCalculation {
  id: string;
  createdAt: number;
  product: string;
  currency: "PEN" | "USD";
  fx: string;
  buy: string;
  costHasCredit: boolean;
  method: Method;
  percent: string;
  extra: string;
  qty: string;
  roundUp: boolean;
  saleMode: SaleView;
  cost: number;
  priceSinIgv: number;
  priceConIgv: number;
  activeFinalPrice: number;
  profit: number;
  realMargin: number;
}

const STORAGE_KEY = "infosistel_calc_history";

function Row({
  k,
  v,
  strong,
  accent,
}: {
  k: string;
  v: string;
  strong?: boolean;
  accent?: "green" | "blue";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-2.5 text-sm last:border-0">
      <span className="text-fg-muted font-medium">{k}</span>
      <span
        className={`${
          strong ? "font-bold text-fg text-base" : "font-semibold text-fg"
        } ${accent === "green" ? "!text-emerald-600 dark:!text-emerald-400 font-bold" : ""} ${
          accent === "blue" ? "!text-blue-600 dark:!text-blue-400 font-bold" : ""
        }`}
      >
        {v}
      </span>
    </div>
  );
}

const money = (n: number, symbol = "S/") =>
  `${symbol} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function PriceCalculator() {
  const [product, setProduct] = useState("");
  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");
  const [fx, setFx] = useState("3.75");
  const [buy, setBuy] = useState("");
  const [costHasCredit, setCostHasCredit] = useState(false);
  const [method, setMethod] = useState<Method>("margen");
  const [percent, setPercent] = useState("15");
  const [extra, setExtra] = useState("0");
  const [qty, setQty] = useState("1");
  const [roundUp, setRoundUp] = useState(false);
  const [saleMode, setSaleMode] = useState<SaleView>("con_igv");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<SavedCalculation[]>([]);
  const [historyFilter, setHistoryFilter] = useState("");
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);

  // Cargar historial persistido de localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (err) {
      console.error("Error al leer historial de calculadora:", err);
    }
  }, []);

  const r = useMemo(() => {
    const rate = currency === "USD" ? num(fx) : 1;
    const buyPen = num(buy) * rate;

    // Costo de compra:
    // - Si deduce crédito fiscal comercial: descuenta el 18% a la compra.
    // - Si compra normal directo (lo que salió del bolsillo): el costo es el monto pagado.
    const netBuy = costHasCredit ? buyPen / (1 + IGV_RATE) : buyPen;
    const cost = netBuy + num(extra);
    const pct = num(percent);
    const q = Math.max(1, Math.floor(num(qty)) || 1);

    let priceSinIgv = 0;
    let invalid = "";
    if (method === "margen") {
      if (pct >= 100) invalid = "El margen sobre venta debe ser menor a 100%.";
      else priceSinIgv = cost / (1 - pct / 100);
    } else {
      priceSinIgv = cost * (1 + pct / 100);
    }

    if (roundUp && priceSinIgv > 0) {
      priceSinIgv = Math.ceil(priceSinIgv);
    }

    // Precio con IGV: SIEMPRE incluye el 18% adicional de la factura
    let priceConIgv = priceSinIgv * (1 + IGV_RATE);
    if (roundUp && priceConIgv > 0) {
      priceConIgv = Math.ceil(priceConIgv);
    }

    const igvAmount = priceConIgv - priceSinIgv;
    const profit = priceSinIgv - cost;

    const activeFinalPrice = saleMode === "con_igv" ? priceConIgv : priceSinIgv;
    const activeTotalPrice = activeFinalPrice * q;

    return {
      cost,
      priceSinIgv,
      priceConIgv,
      activeFinalPrice,
      activeTotalPrice,
      igvAmount,
      profit,
      totalProfit: profit * q,
      realMargin: priceSinIgv > 0 ? (profit / priceSinIgv) * 100 : 0,
      realMarkup: cost > 0 ? (profit / cost) * 100 : 0,
      pct,
      q,
      invalid,
      valid: !invalid && cost > 0,
    };
  }, [currency, fx, buy, costHasCredit, method, percent, extra, qty, roundUp, saleMode]);

  const reset = () => {
    setProduct("");
    setCurrency("PEN");
    setFx("3.75");
    setBuy("");
    setCostHasCredit(false);
    setMethod("margen");
    setPercent("15");
    setExtra("0");
    setQty("1");
    setRoundUp(false);
    setSaleMode("con_igv");
  };

  const copy = async () => {
    const isCon = saleMode === "con_igv";
    const label = isCon ? "Precio con IGV (Factura)" : "Precio sin IGV (Normal)";
    const text = `${product ? product + " — " : ""}${label}: ${money(r.activeFinalPrice)}${
      r.q > 1 ? ` | Total (${r.q} unid.): ${money(r.activeTotalPrice)}` : ""
    }`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveCalculation = () => {
    if (!r.valid || r.invalid) return;

    const newItem: SavedCalculation = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now(),
      product: product.trim(),
      currency,
      fx,
      buy,
      costHasCredit,
      method,
      percent,
      extra,
      qty,
      roundUp,
      saleMode,
      cost: r.cost,
      priceSinIgv: r.priceSinIgv,
      priceConIgv: r.priceConIgv,
      activeFinalPrice: r.activeFinalPrice,
      profit: r.profit,
      realMargin: r.realMargin,
    };

    const updated = [newItem, ...history].slice(0, 50);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Error guardando cálculo:", err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const loadCalculation = (item: SavedCalculation) => {
    setProduct(item.product || "");
    setCurrency(item.currency || "PEN");
    setFx(item.fx || "3.75");
    setBuy(item.buy || "");
    setCostHasCredit(Boolean(item.costHasCredit));
    setMethod(item.method || "margen");
    setPercent(item.percent || "15");
    setExtra(item.extra || "0");
    setQty(item.qty || "1");
    setRoundUp(Boolean(item.roundUp));
    setSaleMode(item.saleMode || "con_igv");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Error eliminando ítem del historial:", err);
    }
  };

  const clearHistory = () => {
    if (!window.confirm("¿Seguro que deseas vaciar todo el historial de cálculos?")) return;
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Error vaciando historial:", err);
    }
  };

  const copyHistoryItem = async (item: SavedCalculation) => {
    const label = item.saleMode === "con_igv" ? "Precio con IGV (Factura)" : "Precio sin IGV (Normal)";
    const text = `${item.product ? item.product + " — " : ""}${label}: ${money(item.activeFinalPrice)}`;
    await navigator.clipboard.writeText(text);
    setCopiedHistoryId(item.id);
    setTimeout(() => setCopiedHistoryId(null), 1500);
  };

  const filteredHistory = useMemo(() => {
    if (!historyFilter.trim()) return history;
    const q = historyFilter.toLowerCase();
    return history.filter(
      (h) =>
        h.product.toLowerCase().includes(q) ||
        money(h.activeFinalPrice).toLowerCase().includes(q)
    );
  }, [history, historyFilter]);

  return (
    <div className="space-y-8">
      {/* Calculadora Principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Columna Izquierda: Datos de la compra */}
        <div className="admin-glass rounded-[var(--radius-lg)] p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-fg">Datos de la compra</h2>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-fg-muted hover:bg-bg-alt hover:text-fg transition-colors"
            >
              <RotateCcw size={13} /> Limpiar
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="pc-product">
                Producto (Opcional)
              </label>
              <input
                id="pc-product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className={inputClass}
                placeholder="Ej. Mouse Gamer, Teclado mecánico, Laptop..."
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pc-currency">
                Moneda de compra
              </label>
              <select
                id="pc-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "PEN" | "USD")}
                className={inputClass}
              >
                <option value="PEN">Soles (PEN)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            {currency === "USD" ? (
              <div>
                <label className={labelClass} htmlFor="pc-fx">
                  Tipo de cambio (S/ por US$)
                </label>
                <input
                  id="pc-fx"
                  type="number"
                  min={0}
                  step={0.01}
                  value={fx}
                  onChange={(e) => setFx(e.target.value)}
                  className={inputClass}
                />
              </div>
            ) : (
              <div>
                <label className={labelClass} htmlFor="pc-buy">
                  Precio de compra (S/)
                </label>
                <input
                  id="pc-buy"
                  type="number"
                  min={0}
                  step={0.01}
                  value={buy}
                  onChange={(e) => setBuy(e.target.value)}
                  className={inputClass}
                  placeholder="Ej. 50.00"
                />
              </div>
            )}

            {currency === "USD" && (
              <div>
                <label className={labelClass} htmlFor="pc-buy">
                  Precio de compra (US$)
                </label>
                <input
                  id="pc-buy"
                  type="number"
                  min={0}
                  step={0.01}
                  value={buy}
                  onChange={(e) => setBuy(e.target.value)}
                  className={inputClass}
                  placeholder="Ej. 15.00"
                />
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="pc-credit">
                Costo de adquisición
              </label>
              <select
                id="pc-credit"
                value={costHasCredit ? "credito" : "directo"}
                onChange={(e) => setCostHasCredit(e.target.value === "credito")}
                className={inputClass}
              >
                <option value="directo">Precio de compra directo (Monto pagado)</option>
                <option value="credito">Deducir 18% de IGV a la compra (Crédito fiscal)</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="pc-method">
                Método de cálculo
              </label>
              <select
                id="pc-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
                className={inputClass}
              >
                <option value="margen">Margen sobre venta</option>
                <option value="recargo">Recargo sobre costo</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="pc-percent">
                {method === "margen" ? "Margen sobre venta (%)" : "Recargo sobre costo (%)"}
              </label>
              <input
                id="pc-percent"
                type="number"
                min={0}
                step={0.1}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pc-extra">
                Otros costos adicionales (S/)
              </label>
              <input
                id="pc-extra"
                type="number"
                min={0}
                step={0.01}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="pc-qty">
                Cantidad
              </label>
              <input
                id="pc-qty"
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={inputClass}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-fg sm:col-span-2 pt-1">
              <input
                type="checkbox"
                checked={roundUp}
                onChange={(e) => setRoundUp(e.target.checked)}
                className="h-4 w-4 rounded accent-accent"
              />
              Redondear el precio final al sol superior
            </label>
          </div>
        </div>

        {/* Columna Derecha: Resultado Nítido, Limpio y de Alto Contraste */}
        <div className="admin-glass rounded-[var(--radius-lg)] p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-fg">
                <Calculator size={18} className="text-accent" /> Resultado de Venta
              </h2>
            </div>

            {r.invalid && <p className="mt-4 text-sm font-semibold text-red-600">{r.invalid}</p>}

            {!r.valid && !r.invalid ? (
              <p className="mt-4 text-sm text-fg-muted">
                Ingresa el precio de compra a la izquierda para ver el resultado de venta.
              </p>
            ) : (
              !r.invalid && (
                <div className="mt-4 space-y-4">
                  {/* Selector elegante para alternar entre Con IGV y Sin IGV */}
                  <div className="flex rounded-xl border border-border/80 bg-bg-surface p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setSaleMode("con_igv")}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        saleMode === "con_igv"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                          : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      Con IGV (Factura +18%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaleMode("sin_igv")}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                        saleMode === "sin_igv"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                          : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      Sin IGV (Venta normal)
                    </button>
                  </div>

                  {/* Tarjeta única principal con contraste impecable y números ultra legibles */}
                  <div
                    className={`relative overflow-hidden rounded-2xl p-5 text-center border transition-all shadow-sm ${
                      saleMode === "con_igv"
                        ? "border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/40 dark:border-blue-500/40"
                        : "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 dark:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          saleMode === "con_igv"
                            ? "text-blue-800 dark:text-blue-300"
                            : "text-emerald-800 dark:text-emerald-300"
                        }`}
                      >
                        {saleMode === "con_igv"
                          ? "PRECIO FINAL CON FACTURA (CON IGV)"
                          : "PRECIO FINAL SIN FACTURA (SIN IGV)"}
                      </span>
                    </div>

                    {/* Número del precio con máximo contraste: color oscuro nítido en tema claro, color brillante en modo oscuro */}
                    <p
                      className={`mt-2 font-display text-4xl sm:text-5xl font-black tracking-tight ${
                        saleMode === "con_igv"
                          ? "text-blue-950 dark:text-blue-100"
                          : "text-emerald-950 dark:text-emerald-100"
                      }`}
                    >
                      {money(r.activeFinalPrice)}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-fg-muted">
                      {saleMode === "con_igv"
                        ? "Incluye 18% de IGV para emisión de factura"
                        : "Precio neto para venta directa o boleta"}
                    </p>

                    {r.q > 1 && (
                      <div className="mt-3 inline-block rounded-lg bg-bg-surface/90 px-3 py-1 border border-border/60">
                        <p className="text-xs font-bold text-fg">
                          Total por {r.q} unidades: {money(r.activeTotalPrice)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Desglose claro y transparente */}
                  <div className="rounded-2xl border border-border/60 bg-bg-surface/90 px-4 py-2 shadow-sm">
                    <Row k="Costo de compra" v={money(r.cost)} />
                    <Row k="Utilidad estimada" v={money(r.profit)} strong accent="green" />
                    <Row k="Precio sin IGV (Base)" v={money(r.priceSinIgv)} />
                    <Row k="IGV 18% (Venta)" v={money(r.igvAmount)} />
                    <Row k="Precio con IGV (Factura)" v={money(r.priceConIgv)} strong accent="blue" />
                    {r.q > 1 && (
                      <Row k={`Utilidad total (${r.q} unid.)`} v={money(r.totalProfit)} strong accent="green" />
                    )}
                    <Row k="Margen real sobre venta" v={`${r.realMargin.toFixed(2)}%`} />
                    <Row k="Recargo real sobre costo" v={`${r.realMarkup.toFixed(2)}%`} />
                  </div>
                </div>
              )
            )}
          </div>

          {/* Acciones principales: Copiar y Guardar */}
          {r.valid && !r.invalid && (
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={copy}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-white shadow-md transition-all active:scale-[0.98] ${
                  saleMode === "con_igv"
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? "¡Precio copiado!" : "Copiar precio"}</span>
              </button>

              <button
                type="button"
                onClick={saveCalculation}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] shadow-sm ${
                  saved
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "border-border/80 bg-bg-surface hover:bg-bg-alt text-fg hover:border-accent"
                }`}
                title="Guardar este cálculo en el historial"
              >
                {saved ? (
                  <>
                    <BookmarkCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Bookmark size={18} className="text-accent" />
                    <span>Guardar cálculo</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sección Historial de Cálculos — Modo Pro */}
      <div className="admin-glass rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <History size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-fg">
                  Historial de Cálculos Guardados
                </h3>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                  {history.length}
                </span>
              </div>
              <p className="text-xs text-fg-muted">
                Guarda tus cálculos para consultarlos, reutilizarlos o copiar sus precios en cualquier momento.
              </p>
            </div>
          </div>

          {history.length > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={13} />
                Vaciar historial
              </button>
            </div>
          )}
        </div>

        {/* Barra de búsqueda de historial si hay más de 3 ítems */}
        {history.length > 3 && (
          <div className="mt-4 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              placeholder="Buscar en historial por nombre de producto..."
              className="admin-field w-full rounded-xl pl-9 pr-4 py-2 text-xs text-fg"
            />
          </div>
        )}

        {/* Contenido del historial */}
        {history.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 py-10 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface text-fg-muted">
              <Bookmark size={22} />
            </div>
            <p className="mt-3 text-sm font-bold text-fg">Aún no tienes cálculos guardados</p>
            <p className="mt-1 text-xs text-fg-muted max-w-sm">
              Cuando calcules el precio de un producto, haz clic en el botón{" "}
              <span className="font-semibold text-fg">“Guardar cálculo”</span> para guardarlo aquí y reutilizarlo cuando lo necesites.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-bg-surface/80 p-4 transition-all hover:border-accent/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-fg line-clamp-1" title={item.product || "Sin nombre"}>
                      {item.product || "Cálculo sin nombre"}
                    </span>
                    <span className="text-[10px] font-semibold text-fg-muted shrink-0 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted block">
                        {item.saleMode === "con_igv" ? "Precio con IGV (Factura)" : "Precio sin IGV (Normal)"}
                      </span>
                      <p
                        className={`text-2xl font-black tracking-tight ${
                          item.saleMode === "con_igv"
                            ? "text-blue-950 dark:text-blue-100"
                            : "text-emerald-950 dark:text-emerald-100"
                        }`}
                      >
                        {money(item.activeFinalPrice)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        item.saleMode === "con_igv"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {item.saleMode === "con_igv" ? "FACTURA" : "SIN IGV"}
                    </span>
                  </div>

                  {/* Resumen de costos */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-bg-alt/70 p-2 text-[11px] border border-border/40">
                    <div>
                      <span className="text-fg-muted block text-[10px]">Costo</span>
                      <span className="font-bold text-fg">{money(item.cost)}</span>
                    </div>
                    <div>
                      <span className="text-fg-muted block text-[10px]">Utilidad</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{money(item.profit)}</span>
                    </div>
                    <div>
                      <span className="text-fg-muted block text-[10px]">Margen</span>
                      <span className="font-bold text-fg">{item.realMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la tarjeta */}
                <div className="mt-4 flex items-center justify-between gap-1.5 border-t border-border/50 pt-3">
                  <button
                    type="button"
                    onClick={() => loadCalculation(item)}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-bold text-accent hover:bg-accent hover:text-white transition-colors"
                    title="Cargar estos datos en la calculadora"
                  >
                    <ArrowUpRight size={13} />
                    Cargar
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyHistoryItem(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg hover:bg-bg-alt transition-colors"
                      title="Copiar precio"
                    >
                      {copiedHistoryId === item.id ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                      <span>{copiedHistoryId === item.id ? "Copiado" : "Copiar"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteHistoryItem(item.id)}
                      className="inline-flex items-center rounded-lg p-1.5 text-fg-muted hover:text-red-600 hover:bg-red-500/10 transition-colors"
                      title="Eliminar de historial"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
