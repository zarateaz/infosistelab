"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Banknote } from "lucide-react";
import { YapeIcon } from "@/components/icons/YapeIcon";
import { PAYMENT_METHOD_INFO, type PaymentMethodType } from "./constants";
import type { AdminTransaction } from "./actions";
import { AddTransactionRow } from "./AddTransactionRow";
import { TransactionRow } from "./TransactionRow";
import { DownloadHistoryPdfButton } from "./DownloadHistoryPdfButton";

interface CashboxMovementsSectionProps {
  month: string;
  showAll: boolean;
  totalCount: number;
  transactions: AdminTransaction[];
  monthTransactionsCount: number;
  selectedAccount?: PaymentMethodType | null;
  onSelectAccount?: (account: PaymentMethodType | null) => void;
}

export function CashboxMovementsSection({
  month,
  showAll,
  totalCount,
  transactions,
  monthTransactionsCount,
  selectedAccount,
  onSelectAccount,
}: CashboxMovementsSectionProps) {
  const [internalFilter, setInternalFilter] = useState<"ALL" | PaymentMethodType>("ALL");
  const methodFilter: "ALL" | PaymentMethodType =
    selectedAccount !== undefined ? (selectedAccount ?? "ALL") : internalFilter;

  const setMethodFilter = (next: "ALL" | PaymentMethodType) => {
    setInternalFilter(next);
    onSelectAccount?.(next === "ALL" ? null : next);
  };

  const filteredTransactions = useMemo(() => {
    if (methodFilter === "ALL") return transactions;
    return transactions.filter((t) => t.paymentMethod === methodFilter);
  }, [transactions, methodFilter]);

  const countsByMethod = useMemo(() => {
    const counts: Record<PaymentMethodType, number> = {
      EFECTIVO: 0,
      "YAPE 1": 0,
      "YAPE 2": 0,
    };
    for (const t of transactions) {
      const m = t.paymentMethod as PaymentMethodType;
      if (counts[m] !== undefined) counts[m] += 1;
    }
    return counts;
  }, [transactions]);

  const netBySelected = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, t) => sum + (t.type === "INCOME" ? t.amount : -t.amount),
      0
    );
  }, [filteredTransactions]);

  return (
    <div className="print:hidden mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-fg">
            Movimientos de caja — {showAll ? "Historial completo" : month}
            {methodFilter !== "ALL" && (
              <span className="ml-2 text-accent">
                · Solo {PAYMENT_METHOD_INFO[methodFilter].name} (Saldo: S/. {netBySelected.toFixed(2)})
              </span>
            )}
          </h2>
          <p className="text-xs text-fg-muted">
            {showAll
              ? `Mostrando ${filteredTransactions.length} de ${transactions.length} movimientos históricos.`
              : `Mostrando ${filteredTransactions.length} movimiento(s) de este mes. Los meses anteriores quedan archivados.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/taller-control/caja?month=${month}`}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              !showAll
                ? "bg-accent text-accent-fg shadow-sm"
                : "border border-border bg-bg-alt text-fg-muted hover:text-fg"
            }`}
          >
            Mes activo ({month})
          </Link>
          <Link
            href={`/taller-control/caja?month=${month}&view=all`}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              showAll
                ? "bg-accent text-accent-fg shadow-sm"
                : "border border-border bg-bg-alt text-fg-muted hover:text-fg"
            }`}
          >
            Ver todo ({totalCount})
          </Link>
          <DownloadHistoryPdfButton
            transactions={filteredTransactions}
            label={
              methodFilter === "ALL"
                ? showAll
                  ? `Descargar PDF (${transactions.length})`
                  : `Descargar PDF (${monthTransactionsCount})`
                : `PDF ${PAYMENT_METHOD_INFO[methodFilter].name} (${filteredTransactions.length})`
            }
            monthKey={
              methodFilter === "ALL"
                ? showAll
                  ? "HISTORIAL_COMPLETO"
                  : month
                : `${showAll ? "HISTORIAL" : month}_${methodFilter.replace(/\s+/g, "")}`
            }
            monthLabel={
              methodFilter === "ALL"
                ? showAll
                  ? "Historial Completo de Caja"
                  : `Reporte de Caja ${month}`
                : `Reporte ${PAYMENT_METHOD_INFO[methodFilter].name} (${PAYMENT_METHOD_INFO[methodFilter].titular}) — ${
                    showAll ? "Historial" : month
                  }`
            }
          />
        </div>
      </div>

      {/* Pestañas de filtro por cuenta en la tabla de movimientos */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMethodFilter("ALL")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            methodFilter === "ALL"
              ? "bg-fg text-bg shadow-xs"
              : "border border-border bg-bg-alt/60 text-fg-muted hover:text-fg"
          }`}
        >
          <span>Todas las cuentas ({transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMethodFilter("EFECTIVO")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            methodFilter === "EFECTIVO"
              ? "bg-emerald-600 text-white shadow-xs"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          <Banknote size={13} />
          <span>Efectivo ({countsByMethod["EFECTIVO"]})</span>
        </button>

        <button
          type="button"
          onClick={() => setMethodFilter("YAPE 1")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            methodFilter === "YAPE 1"
              ? "bg-[#742284] text-white shadow-xs"
              : "border border-[#742284]/30 bg-[#742284]/10 text-[#742284] dark:text-[#c084fc] hover:bg-[#742284]/20"
          }`}
        >
          <YapeIcon size={14} className="rounded-xs" />
          <span>Yape 1 · Edgar ({countsByMethod["YAPE 1"]})</span>
        </button>

        <button
          type="button"
          onClick={() => setMethodFilter("YAPE 2")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
            methodFilter === "YAPE 2"
              ? "bg-fuchsia-700 text-white shadow-xs"
              : "border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-500/20"
          }`}
        >
          <YapeIcon size={14} className="rounded-xs" />
          <span>Yape 2 · Caja ({countsByMethod["YAPE 2"]})</span>
        </button>
      </div>

      <div className="overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Descripción</th>
              <th className="px-5 py-3">Método</th>
              <th className="px-5 py-3">Monto</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            <AddTransactionRow />
            {[...filteredTransactions].reverse().map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-fg-muted">
                  <p className="font-semibold text-fg">
                    {methodFilter === "ALL"
                      ? `Todavía no hay movimientos registrados en ${month}.`
                      : `No hay movimientos registrados con ${PAYMENT_METHOD_INFO[methodFilter].name} en este período.`}
                  </p>
                  <p className="mt-1 text-xs">
                    Usa &quot;+ Agregar movimiento&quot; para registrar uno nuevo.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

