import {
  getCashboxTransactions,
  getCashboxTransactionsForMonth,
  getCashboxPeriod,
  getCashboxMonthsSummary,
  getCashboxTransactionsCount,
} from "./actions";
import { monthKey } from "./month";
import { PAYMENT_METHODS, type PaymentMethodType } from "./constants";
import { CashboxInteractiveWorkspace } from "./CashboxInteractiveWorkspace";

export default async function AdminCashboxPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const { month: monthParam, view } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : monthKey();
  const showAll = view === "all";

  // Execute essential month queries in parallel.
  // Note: We only fetch the full historical table if showAll === true.
  const [monthTransactions, period, monthsSummary, totalCount] = await Promise.all([
    getCashboxTransactionsForMonth(month),
    getCashboxPeriod(month),
    getCashboxMonthsSummary(),
    getCashboxTransactionsCount(),
  ]);

  const transactions = showAll ? await getCashboxTransactions() : monthTransactions;
  const availableMonths = monthsSummary.map((m) => m.month);
  const displayedTransactions = showAll ? transactions : monthTransactions;

  // Monthly balance starts from 0 for each month! When viewing a specific month,
  // it computes strictly the transactions of that month, not carrying over past months.
  const balance = displayedTransactions.reduce(
    (sum, t) => sum + (t.type === "INCOME" ? t.amount : -t.amount),
    0
  );

  const totalsByMethod = Object.fromEntries(
    PAYMENT_METHODS.map((method) => [
      method,
      displayedTransactions
        .filter((t) => t.paymentMethod === method)
        .reduce((sum, t) => sum + (t.type === "INCOME" ? t.amount : -t.amount), 0),
    ])
  ) as Record<PaymentMethodType, number>;

  const [yearStr, monthStr] = month.split("-");
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const monthLabel = `${monthNames[monthIndex] || month} de ${yearStr}`;

  return (
    <CashboxInteractiveWorkspace
      month={month}
      monthLabel={monthLabel}
      showAll={showAll}
      balance={balance}
      totalCount={totalCount}
      totalsByMethod={totalsByMethod}
      displayedTransactions={displayedTransactions}
      monthTransactions={monthTransactions}
      allTransactions={showAll ? transactions : undefined}
      period={period}
      availableMonths={availableMonths}
      monthsSummary={monthsSummary}
    />
  );
}
