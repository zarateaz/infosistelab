"use client";
import type { CashboxMonthSummary } from "./actions";

interface MonthSelectorProps {
  month: string;
  availableMonths: string[];
  monthsSummary?: CashboxMonthSummary[];
}

/** Plain GET-form select that navigates to ?month=... on change — kept as
 *  its own client component only because a <select onChange> can't live
 *  directly in the server-rendered page.tsx. */
export function MonthSelector({
  month,
  availableMonths,
  monthsSummary,
}: MonthSelectorProps) {
  const summaryMap = new Map(monthsSummary?.map((s) => [s.month, s]));

  return (
    <form action="/taller-control/caja" method="get">
      <select
        name="month"
        value={month}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-full border border-border-strong bg-bg px-4 py-1.5 text-xs font-bold text-fg outline-none focus:border-accent shadow-sm cursor-pointer"
      >
        {availableMonths.map((m) => {
          const summary = summaryMap.get(m);
          let displayLabel = m;
          if (summary) {
            displayLabel = summary.isCurrent
              ? `${summary.label} (En curso · ${summary.count} mov.)`
              : `${summary.label} (${summary.count} mov.)`;
          }
          return (
            <option key={m} value={m}>
              {displayLabel}
            </option>
          );
        })}
      </select>
    </form>
  );
}
