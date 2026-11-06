"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthKey } from "./month";
import type { AdminCashboxPeriod, AdminTransaction, CashboxMonthSummary } from "./actions";
import type { PaymentMethodType } from "./constants";
import { AddTransactionForm } from "./AddTransactionForm";
import { PeriodHeader } from "./PeriodHeader";
import { MonthlyReport } from "./MonthlyReport";
import { MonthSelector } from "./MonthSelector";
import { MonthlyReportsArchive } from "./MonthlyReportsArchive";
import { CashboxMethodCards } from "./CashboxMethodCards";
import { CashboxMovementsSection } from "./CashboxMovementsSection";

function adjacentMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split("-").map(Number);
  const d = new Date(year, monthNum - 1 + delta, 1);
  return monthKey(d);
}

interface CashboxInteractiveWorkspaceProps {
  month: string;
  monthLabel: string;
  showAll: boolean;
  balance: number;
  totalCount: number;
  totalsByMethod: Record<PaymentMethodType, number>;
  displayedTransactions: AdminTransaction[];
  monthTransactions: AdminTransaction[];
  allTransactions?: AdminTransaction[];
  period: AdminCashboxPeriod | null;
  availableMonths: string[];
  monthsSummary: CashboxMonthSummary[];
}

export function CashboxInteractiveWorkspace({
  month,
  monthLabel,
  showAll,
  balance,
  totalCount,
  totalsByMethod,
  displayedTransactions,
  monthTransactions,
  allTransactions,
  period,
  availableMonths,
  monthsSummary,
}: CashboxInteractiveWorkspaceProps) {
  const [selectedAccount, setSelectedAccount] = useState<PaymentMethodType | null>(null);

  return (
    <div>
      <div className="print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
                Caja — {showAll ? "Historial Completo" : monthLabel}
              </h1>
              {!showAll && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Mes activo · Inicia en S/. 0.00
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              {showAll
                ? `Saldo histórico acumulado: S/. ${balance.toFixed(2)} (${displayedTransactions.length} movimientos)`
                : `Saldo neto de ${monthLabel}: S/. ${balance.toFixed(2)} (${monthTransactions.length} mov.)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/taller-control/caja?month=${adjacentMonth(month, -1)}`}
              aria-label="Mes anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent"
            >
              <ChevronLeft size={15} />
            </Link>
            <MonthSelector
              month={month}
              availableMonths={availableMonths}
              monthsSummary={monthsSummary}
            />
            <Link
              href={`/taller-control/caja?month=${adjacentMonth(month, 1)}`}
              aria-label="Mes siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent"
            >
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <CashboxMethodCards
            totals={totalsByMethod}
            periodLabel={showAll ? "Historial Completo" : monthLabel}
            monthKey={showAll ? "HISTORIAL_COMPLETO" : month}
            transactions={displayedTransactions}
            selectedAccount={selectedAccount}
            onSelectAccount={setSelectedAccount}
          />
        </div>

        <div className="mt-8">
          <AddTransactionForm month={month} />
        </div>
      </div>

      <div className="print:hidden mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-fg">Reporte mensual</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/taller-control/caja?month=${adjacentMonth(month, -1)}`}
            aria-label="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronLeft size={15} />
          </Link>
          <MonthSelector
            month={month}
            availableMonths={availableMonths}
            monthsSummary={monthsSummary}
          />
          <Link
            href={`/taller-control/caja?month=${adjacentMonth(month, 1)}`}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      <div className="print:hidden mt-4">
        <PeriodHeader month={month} period={period} />
      </div>

      <div className="mt-4">
        <MonthlyReport
          month={month}
          period={period}
          transactions={monthTransactions}
          monthsSummary={monthsSummary}
          allTransactions={allTransactions}
          selectedAccount={selectedAccount}
        />
      </div>

      <div className="print:hidden mt-8">
        <MonthlyReportsArchive
          monthsSummary={monthsSummary}
          allTransactions={allTransactions}
          currentSelectedMonth={month}
        />
      </div>

      <CashboxMovementsSection
        month={month}
        showAll={showAll}
        totalCount={totalCount}
        transactions={displayedTransactions}
        monthTransactionsCount={monthTransactions.length}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
      />
    </div>
  );
}
