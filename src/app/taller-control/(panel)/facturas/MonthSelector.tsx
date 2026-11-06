"use client";

/** Plain GET-form select that navigates to ?month=... on change — same
 *  pattern as caja/MonthSelector.tsx. */
export function MonthSelector({ month, availableMonths }: { month: string; availableMonths: string[] }) {
  return (
    <form action="/taller-control/facturas" method="get">
      <select
        name="month"
        defaultValue={month}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-full border border-border-strong bg-bg px-4 py-1.5 text-xs font-bold text-fg outline-none focus:border-accent"
      >
        {availableMonths.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </form>
  );
}
