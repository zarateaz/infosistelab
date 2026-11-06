"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  X,
  Download,
  TrendingUp,
  ListFilter,
  RotateCcw,
} from "lucide-react";
import { YapeIcon } from "@/components/icons/YapeIcon";
import { PAYMENT_METHOD_INFO, PAYMENT_METHODS, type PaymentMethodType } from "./constants";
import type { AdminTransaction } from "./actions";
import { CajaChart, type ChartFilterMode } from "./CajaChart";
import { generateCashboxReportPDF } from "@/lib/pdfReportGenerator";

interface CashboxMethodCardsProps {
  totals: Record<PaymentMethodType, number>;
  periodLabel: string;
  monthKey: string;
  transactions: AdminTransaction[];
  selectedAccount?: PaymentMethodType | null;
  onSelectAccount?: (account: PaymentMethodType | null) => void;
}

interface MethodStats {
  income: number;
  expense: number;
  net: number;
  count: number;
}

function formatDateUTC(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function CashboxMethodCards({
  totals,
  periodLabel,
  monthKey,
  transactions,
  selectedAccount: controlledAccount,
  onSelectAccount,
}: CashboxMethodCardsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [internalAccount, setInternalAccount] = useState<PaymentMethodType | null>(null);
  const [previewModalAccount, setPreviewModalAccount] = useState<PaymentMethodType | null>(null);
  const [chartMode, setChartMode] = useState<ChartFilterMode>("ALL");

  const selectedAccount = controlledAccount !== undefined ? controlledAccount : internalAccount;
  const updateSelectedAccount = (next: PaymentMethodType | null) => {
    setInternalAccount(next);
    onSelectAccount?.(next);
  };

  const copyNumber = async (id: string, number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  // Compute detailed stats (income, expense, net, count) per payment method
  const statsByMethod = useMemo(() => {
    const map: Record<PaymentMethodType, MethodStats> = {
      EFECTIVO: { income: 0, expense: 0, net: totals["EFECTIVO"] ?? 0, count: 0 },
      "YAPE 1": { income: 0, expense: 0, net: totals["YAPE 1"] ?? 0, count: 0 },
      "YAPE 2": { income: 0, expense: 0, net: totals["YAPE 2"] ?? 0, count: 0 },
    };

    for (const t of transactions) {
      const m = t.paymentMethod as PaymentMethodType;
      if (!map[m]) continue;
      map[m].count += 1;
      if (t.type === "INCOME") map[m].income += t.amount;
      else map[m].expense += t.amount;
    }

    for (const m of PAYMENT_METHODS) {
      map[m].net = map[m].income - map[m].expense;
    }

    return map;
  }, [transactions, totals]);

  const totalGeneral = useMemo(
    () =>
      (statsByMethod["EFECTIVO"]?.net ?? 0) +
      (statsByMethod["YAPE 1"]?.net ?? 0) +
      (statsByMethod["YAPE 2"]?.net ?? 0),
    [statsByMethod]
  );

  // Select card to filter chart & show inline account preview
  const handleSelectCard = (method: PaymentMethodType) => {
    if (selectedAccount === method) {
      updateSelectedAccount(null);
      setChartMode("ALL");
    } else {
      updateSelectedAccount(method);
      setChartMode(method);
    }
  };

  // Transactions with independent running balance for the modal or active preview
  const activeAccountForPreview = previewModalAccount ?? selectedAccount;
  const accountLedger = useMemo(() => {
    if (!activeAccountForPreview) return [];
    let running = 0;
    const rows = transactions
      .filter((t) => t.paymentMethod === activeAccountForPreview)
      .map((t) => {
        const isInc = t.type === "INCOME";
        running += isInc ? t.amount : -t.amount;
        return {
          ...t,
          isInc,
          runningAfter: running,
        };
      });
    return rows.reverse();
  }, [transactions, activeAccountForPreview]);

  const handleDownloadAccountPDF = (method: PaymentMethodType) => {
    const info = PAYMENT_METHOD_INFO[method];
    const filtered = transactions.filter((t) => t.paymentMethod === method);
    generateCashboxReportPDF({
      month: `${monthKey}_${method.replace(/\s+/g, "")}`,
      monthLabel: `${periodLabel} — Solo ${info.name} (${info.titular})`,
      responsible: info.titular,
      transactions: filtered,
    });
  };

  const yape1 = PAYMENT_METHOD_INFO["YAPE 1"];
  const yape2 = PAYMENT_METHOD_INFO["YAPE 2"];

  return (
    <div>
      {/* Barra superior del Previsualizador de Cuentas */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-fg-muted">
            Saldos independientes por cuenta
          </span>
          <span className="hidden sm:inline-block text-xs text-fg-muted">
            · Haz clic en una tarjeta para filtrar su evolución o ver su estado de cuenta
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedAccount && (
            <button
              type="button"
              onClick={() => {
                updateSelectedAccount(null);
                setChartMode("ALL");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold text-accent transition-all hover:bg-accent hover:text-accent-fg"
            >
              <RotateCcw size={12} />
              <span>Ver todas las cuentas (S/. {totalGeneral.toFixed(2)})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              updateSelectedAccount(null);
              setChartMode(chartMode === "COMPARE" ? "ALL" : "COMPARE");
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
              chartMode === "COMPARE"
                ? "bg-accent text-accent-fg shadow-sm"
                : "border border-border bg-bg-alt text-fg-muted hover:border-accent hover:text-fg"
            }`}
          >
            <TrendingUp size={13} />
            <span>{chartMode === "COMPARE" ? "Viendo comparativa 3 cuentas" : "Comparar las 3 en gráfico"}</span>
          </button>
        </div>
      </div>

      {/* Las 3 Tarjetas de Cuenta */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 1. Tarjeta EFECTIVO */}
        <div
          onClick={() => handleSelectCard("EFECTIVO")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleSelectCard("EFECTIVO");
          }}
          className={`group admin-glass relative cursor-pointer overflow-hidden rounded-[var(--radius-lg)] p-5 transition-all duration-300 hover:-translate-y-1 ${
            selectedAccount === "EFECTIVO"
              ? "ring-2 ring-emerald-500 border-emerald-500 shadow-xl shadow-emerald-500/15 bg-emerald-500/[0.03]"
              : "border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] transition-all group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white">
                <Banknote size={24} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Efectivo
                </p>
                <p className="text-[11px] font-semibold text-fg-muted">Caja física del taller</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              {statsByMethod["EFECTIVO"].count} movs.
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                Saldo disponible
              </span>
              {selectedAccount === "EFECTIVO" && (
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  ● Filtro activo
                </span>
              )}
            </div>
            <p className="mt-0.5 font-display text-3xl font-black tracking-tight text-fg">
              S/. {statsByMethod["EFECTIVO"].net.toFixed(2)}
            </p>
          </div>

          {/* Desglose Ingresos / Egresos de Efectivo */}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-2.5 text-xs">
            <div>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight size={12} /> Ingresos
              </span>
              <p className="mt-0.5 font-extrabold text-fg">
                + S/. {statsByMethod["EFECTIVO"].income.toFixed(2)}
              </p>
            </div>
            <div className="border-l border-emerald-500/20 pl-2.5">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
                <ArrowDownRight size={12} /> Egresos
              </span>
              <p className="mt-0.5 font-extrabold text-fg">
                - S/. {statsByMethod["EFECTIVO"].expense.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Acciones rápidas de la tarjeta */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-fg-muted truncate">
              Billetes y monedas ({periodLabel})
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewModalAccount("EFECTIVO");
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 transition-colors hover:bg-emerald-600 hover:text-white"
            >
              <Eye size={12} />
              <span>Previsualizar</span>
            </button>
          </div>
        </div>

        {/* 2. Tarjeta YAPE 1 — Laboratorio INFOSISTEL */}
        <div
          onClick={() => handleSelectCard("YAPE 1")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleSelectCard("YAPE 1");
          }}
          className={`group admin-glass relative cursor-pointer overflow-hidden rounded-[var(--radius-lg)] p-5 transition-all duration-300 hover:-translate-y-1 ${
            selectedAccount === "YAPE 1"
              ? "ring-2 ring-[#742284] border-[#742284] shadow-xl shadow-[#742284]/20 bg-[#742284]/[0.04]"
              : "border-[#742284]/25 dark:border-[#742284]/50 hover:border-[#742284] hover:shadow-xl hover:shadow-[#742284]/15"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-2xl p-0.5 transition-transform duration-300 group-hover:scale-105">
                <YapeIcon size={46} className="shadow-md" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#742284] dark:text-[#c084fc]">
                    Yape 1
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#00D4B8] shadow-[0_0_8px_#00D4B8] animate-pulse" />
                  <span className="rounded-full bg-[#742284]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#742284] dark:text-[#e9d5ff]">
                    {statsByMethod["YAPE 1"].count} movs.
                  </span>
                </div>
                <p className="text-sm font-extrabold text-fg leading-tight mt-0.5">{yape1.titular}</p>
              </div>
            </div>

            {/* Chip interactivo para copiar número */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyNumber("yape1", yape1.phone || "");
              }}
              title="Clic para copiar número"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#742284]/30 bg-[#742284]/10 dark:bg-[#742284]/25 px-2.5 py-1.5 text-xs font-mono font-black text-[#742284] dark:text-[#e9d5ff] transition-all hover:bg-[#742284] hover:text-white active:scale-95 shadow-xs"
            >
              {copiedId === "yape1" ? (
                <>
                  <Check size={13} className="text-emerald-500 dark:text-[#00D4B8]" />
                  <span className="text-emerald-600 dark:text-[#00D4B8] font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <span>{yape1.formattedPhone}</span>
                  <Copy size={11} className="opacity-70 group-hover:opacity-100" />
                </>
              )}
            </button>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                Saldo Yape 1
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-[#742284]/30 border border-purple-200 dark:border-[#742284]/50 px-2 py-0.5 text-[10px] font-extrabold text-purple-900 dark:text-purple-200">
                {selectedAccount === "YAPE 1" ? "● Filtro activo" : `Titular: ${yape1.titular}`}
              </span>
            </div>
            <p className="mt-0.5 font-display text-3xl font-black tracking-tight text-fg">
              S/. {statsByMethod["YAPE 1"].net.toFixed(2)}
            </p>
          </div>

          {/* Desglose Ingresos / Egresos de Yape 1 */}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#742284]/20 bg-[#742284]/[0.04] p-2.5 text-xs">
            <div>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight size={12} /> Ingresos
              </span>
              <p className="mt-0.5 font-extrabold text-fg">
                + S/. {statsByMethod["YAPE 1"].income.toFixed(2)}
              </p>
            </div>
            <div className="border-l border-[#742284]/20 pl-2.5">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
                <ArrowDownRight size={12} /> Egresos
              </span>
              <p className="mt-0.5 font-extrabold text-fg">
                - S/. {statsByMethod["YAPE 1"].expense.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-fg-muted truncate">
              {yape1.titular} · Tel. {yape1.formattedPhone}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewModalAccount("YAPE 1");
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#742284]/30 bg-[#742284]/10 px-2.5 py-1 text-[11px] font-bold text-[#742284] dark:text-[#e9d5ff] transition-colors hover:bg-[#742284] hover:text-white"
            >
              <Eye size={12} />
              <span>Previsualizar</span>
            </button>
          </div>
        </div>

        {/* 3. Tarjeta YAPE 2 — Yape Caja */}
        <div
          onClick={() => handleSelectCard("YAPE 2")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleSelectCard("YAPE 2");
          }}
          className={`group admin-glass relative cursor-pointer overflow-hidden rounded-[var(--radius-lg)] p-5 transition-all duration-300 hover:-translate-y-1 ${
            selectedAccount === "YAPE 2"
              ? "ring-2 ring-fuchsia-600 border-fuchsia-600 shadow-xl shadow-fuchsia-600/20 bg-fuchsia-600/[0.04]"
              : "border-[#742284]/25 dark:border-[#742284]/50 hover:border-[#742284] hover:shadow-xl hover:shadow-[#742284]/15"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-2xl p-0.5 transition-transform duration-300 group-hover:scale-105">
                <YapeIcon size={46} className="shadow-md" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#742284] dark:text-[#c084fc]">
                    Yape 2
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#00D4B8] shadow-[0_0_8px_#00D4B8] animate-pulse" />
                  <span className="rounded-full bg-[#742284]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#742284] dark:text-[#e9d5ff]">
                    {statsByMethod["YAPE 2"].count} movs.
                  </span>
                </div>
                <p className="text-sm font-extrabold text-fg leading-tight mt-0.5">{yape2.titular}</p>
              </div>
            </div>

            {/* Chip interactivo para copiar número */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyNumber("yape2", yape2.phone || "");
              }}
              title="Clic para copiar número"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#742284]/30 bg-[#742284]/10 dark:bg-[#742284]/25 px-2.5 py-1.5 text-xs font-mono font-black text-[#742284] dark:text-[#e9d5ff] transition-all hover:bg-[#742284] hover:text-white active:scale-95 shadow-xs"
            >
              {copiedId === "yape2" ? (
                <>
                  <Check size={13} className="text-emerald-500 dark:text-[#00D4B8]" />
                  <span className="text-emerald-600 dark:text-[#00D4B8] font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <span>{yape2.formattedPhone}</span>
                  <Copy size={11} className="opacity-70 group-hover:opacity-100" />
                </>
              )}
            </button>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                Saldo Yape 2
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-[#742284]/30 border border-purple-200 dark:border-[#742284]/50 px-2 py-0.5 text-[10px] font-extrabold text-purple-900 dark:text-purple-200">
                {selectedAccount === "YAPE 2" ? "● Filtro activo" : `Titular: ${yape2.titular}`}
              </span>
            </div>
            <p className="mt-0.5 font-display text-3xl font-black tracking-tight text-fg">
              S/. {statsByMethod["YAPE 2"].net.toFixed(2)}
            </p>
          </div>

          {/* Desglose Ingresos / Egresos de Yape 2 */}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#742284]/20 bg-[#742284]/[0.04] p-2.5 text-xs">
            <div>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight size={12} /> Ingresos
              </span>
              <p className="mt-0.5 font-extrabold text-fg">
                + S/. {statsByMethod["YAPE 2"].income.toFixed(2)}
              </p>
            </div>
            <div className="border-l border-[#742284]/20 pl-2.5">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
                <ArrowDownRight size={12} /> Egresos
              </span>
              <p className="mt-0.5 font-extrabold text-fg">
                - S/. {statsByMethod["YAPE 2"].expense.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-fg-muted truncate">
              {yape2.titular} · Tel. {yape2.formattedPhone}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewModalAccount("YAPE 2");
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#742284]/30 bg-[#742284]/10 px-2.5 py-1 text-[11px] font-bold text-[#742284] dark:text-[#e9d5ff] transition-colors hover:bg-[#742284] hover:text-white"
            >
              <Eye size={12} />
              <span>Previsualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Panel Desplegable en Vivo cuando se selecciona una tarjeta */}
      {selectedAccount && (
        <div className="mt-5 admin-glass rounded-[var(--radius-lg)] border-2 border-accent/30 p-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <ListFilter size={18} className="text-accent" />
              <div>
                <h3 className="font-display text-sm font-bold text-fg">
                  Previsualización rápida: {PAYMENT_METHOD_INFO[selectedAccount].name} —{" "}
                  {PAYMENT_METHOD_INFO[selectedAccount].titular}
                </h3>
                <p className="text-xs text-fg-muted">
                  Mostrando los últimos movimientos exclusivos de esta cuenta y su saldo acumulado independiente.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadAccountPDF(selectedAccount)}
                disabled={accountLedger.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg shadow-xs transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Download size={13} />
                <span>PDF de {PAYMENT_METHOD_INFO[selectedAccount].name}</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewModalAccount(selectedAccount)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-1.5 text-xs font-bold text-fg hover:border-accent hover:text-accent"
              >
                <Eye size={13} />
                <span>Abrir extracto completo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSelectedAccount(null);
                  setChartMode("ALL");
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-alt hover:text-fg"
                title="Cerrar filtro"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {accountLedger.length === 0 ? (
            <p className="py-6 text-center text-xs text-fg-muted">
              No hay movimientos registrados para {PAYMENT_METHOD_INFO[selectedAccount].name} en {periodLabel}.
            </p>
          ) : (
            <div className="mt-3 max-h-80 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                    <th className="py-2 px-3">Fecha</th>
                    <th className="py-2 px-3">Concepto</th>
                    <th className="py-2 px-3 text-right">Ingreso (+)</th>
                    <th className="py-2 px-3 text-right">Egreso (-)</th>
                    <th className="py-2 px-3 text-right">Saldo en {PAYMENT_METHOD_INFO[selectedAccount].name}</th>
                  </tr>
                </thead>
                <tbody>
                  {accountLedger.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-fg/[0.02]">
                      <td className="py-2 px-3 whitespace-nowrap text-fg-muted">{formatDateUTC(row.date)}</td>
                      <td className="py-2 px-3 font-semibold text-fg">{row.description}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">
                        {row.isInc ? `+ S/. ${row.amount.toFixed(2)}` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-red-600">
                        {!row.isInc ? `- S/. ${row.amount.toFixed(2)}` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-fg">
                        S/. {row.runningAfter.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Gráfico de Evolución del Saldo (Sincronizado con las tarjetas) */}
      <div className="mt-8 admin-glass rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-display text-lg font-bold text-fg">
            Evolución del saldo — {periodLabel}
          </h2>
          <span className="text-xs text-fg-muted font-medium">
            {chartMode === "COMPARE"
              ? "Comparando Efectivo vs Yape 1 vs Yape 2"
              : chartMode === "ALL"
              ? `Inicia desde S/. 0.00 en ${periodLabel}`
              : `Mostrando curva exclusiva de ${PAYMENT_METHOD_INFO[chartMode].name}`}
          </span>
        </div>
        <CajaChart
          transactions={transactions}
          activeFilter={chartMode}
          onFilterChange={(m) => {
            setChartMode(m);
            if (m === "EFECTIVO" || m === "YAPE 1" || m === "YAPE 2") {
              updateSelectedAccount(m);
            } else {
              updateSelectedAccount(null);
            }
          }}
        />
      </div>

      {/* Modal Previsualizador Completo de Estado de Cuenta Individual */}
      {previewModalAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalAccount(null)}
        >
          <div
            className="admin-glass relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-bg p-6 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Estado de Cuenta */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-3.5">
                {previewModalAccount === "EFECTIVO" ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                    <Banknote size={26} />
                  </div>
                ) : (
                  <YapeIcon size={48} className="shadow-md" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent">
                      Estado de Cuenta Individual
                    </span>
                    <span className="text-xs font-semibold text-fg-muted">{periodLabel}</span>
                  </div>
                  <h3 className="mt-1 font-display text-xl font-black text-fg">
                    {PAYMENT_METHOD_INFO[previewModalAccount].name} —{" "}
                    {PAYMENT_METHOD_INFO[previewModalAccount].titular}
                  </h3>
                  {PAYMENT_METHOD_INFO[previewModalAccount].formattedPhone && (
                    <p className="text-xs text-fg-muted">
                      Número afiliado: {PAYMENT_METHOD_INFO[previewModalAccount].formattedPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAccountPDF(previewModalAccount)}
                  disabled={accountLedger.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-fg shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Download size={14} />
                  <span>Descargar PDF de esta cuenta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalAccount(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-fg-muted hover:bg-bg-alt hover:text-fg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 3 KPIs de la Cuenta */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Total Ingresos ({PAYMENT_METHOD_INFO[previewModalAccount].name})
                </span>
                <p className="mt-1 font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  + S/. {statsByMethod[previewModalAccount].income.toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  Total Egresos ({PAYMENT_METHOD_INFO[previewModalAccount].name})
                </span>
                <p className="mt-1 font-display text-2xl font-black text-red-600 dark:text-red-400">
                  - S/. {statsByMethod[previewModalAccount].expense.toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                  Saldo Disponible Final
                </span>
                <p className="mt-1 font-display text-2xl font-black text-fg">
                  S/. {statsByMethod[previewModalAccount].net.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Tabla de Movimientos Exclusivos de la Cuenta */}
            <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-border">
              {accountLedger.length === 0 ? (
                <div className="py-12 text-center text-sm text-fg-muted">
                  No se registraron movimientos en {PAYMENT_METHOD_INFO[previewModalAccount].name} durante{" "}
                  {periodLabel}.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-bg-alt border-b border-border text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                    <tr>
                      <th className="py-2.5 px-4">Fecha</th>
                      <th className="py-2.5 px-4">Concepto / Descripción</th>
                      <th className="py-2.5 px-4 text-right">Ingreso</th>
                      <th className="py-2.5 px-4 text-right">Egreso</th>
                      <th className="py-2.5 px-4 text-right">Saldo en Cuenta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountLedger.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-fg/[0.02]">
                        <td className="py-2.5 px-4 whitespace-nowrap text-fg-muted">
                          {formatDateUTC(row.date)}
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="font-semibold text-fg">{row.description}</p>
                          {row.notes && <p className="text-[11px] text-fg-muted">{row.notes}</p>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                          {row.isInc ? `+ S/. ${row.amount.toFixed(2)}` : ""}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-red-600">
                          {!row.isInc ? `- S/. ${row.amount.toFixed(2)}` : ""}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-fg">
                          S/. {row.runningAfter.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
