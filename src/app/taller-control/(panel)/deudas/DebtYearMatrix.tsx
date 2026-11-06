"use client";

import { Check } from "lucide-react";
import {
  CATEGORY_INFO,
  DEBT_CATEGORIES,
  MONTH_SHORT,
  money,
  periodState,
  type DebtRow,
  type PeriodState,
} from "./deudas";

const CELL: Record<PeriodState["status"], string> = {
  PAGADO: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/30",
  VENCIDO: "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/30",
  POR_VENCER: "bg-amber-400 text-amber-950 hover:bg-amber-500",
  PENDIENTE: "bg-bg-alt text-fg-muted ring-1 ring-inset ring-border hover:ring-accent",
  NO_APLICA: "bg-transparent text-fg-muted/30 cursor-default",
};

/** Matriz anual tipo Excel: una fila por obligación, una columna por mes
 *  (ENE–DIC). Cada celda abre el pago de ese mes. */
export function DebtYearMatrix({
  debts,
  year,
  today,
  onOpen,
}: {
  debts: DebtRow[];
  year: number;
  today: string;
  onOpen: (debt: DebtRow, period: string) => void;
}) {
  const periods = MONTH_SHORT.map((_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const currentPeriod = today.slice(0, 7);

  const paidPerMonth = periods.map((p) =>
    debts.reduce((sum, d) => sum + (d.payments.find((x) => x.period === p)?.amount ?? 0), 0)
  );
  const duePerMonth = periods.map((p) =>
    debts.reduce((sum, d) => {
      const st = periodState(d, p, today);
      return st.status === "NO_APLICA" || st.status === "PAGADO" ? sum : sum + d.amount;
    }, 0)
  );
  const yearPaid = paidPerMonth.reduce((a, b) => a + b, 0);

  const groups = DEBT_CATEGORIES.map((c) => ({ c, rows: debts.filter((d) => d.category === c) })).filter(
    (g) => g.rows.length > 0
  );

  return (
    <div className="admin-glass overflow-hidden rounded-[var(--radius-lg)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="admin-thead text-[11px] font-bold uppercase tracking-wider text-fg-muted">
              <th className="sticky left-0 z-10 bg-bg-surface px-4 py-3 text-left">Obligación</th>
              {periods.map((p, i) => (
                <th
                  key={p}
                  className={`px-1 py-3 text-center ${p === currentPeriod ? "text-accent" : ""}`}
                >
                  {MONTH_SHORT[i]}
                  {p === currentPeriod && <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-accent" />}
                </th>
              ))}
              <th className="px-3 py-3 text-right">Pagado {year}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ c, rows }) => (
              <GroupRows key={c} category={c} rows={rows} periods={periods} today={today} onOpen={onOpen} />
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-fg-muted">
                  No hay obligaciones que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
          {groups.length > 0 && (
            <tfoot>
              <tr className="text-xs font-extrabold">
                <td className="sticky left-0 z-10 border-t-2 border-border bg-bg-surface px-4 py-3 text-fg">
                  Total pagado
                </td>
                {paidPerMonth.map((v, i) => (
                  <td key={i} className="border-t-2 border-border px-1 py-3 text-center text-emerald-600">
                    {v > 0 ? v.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "—"}
                  </td>
                ))}
                <td className="border-t-2 border-border px-3 py-3 text-right text-emerald-600">{money(yearPaid)}</td>
              </tr>
              <tr className="text-xs font-bold">
                <td className="sticky left-0 z-10 bg-bg-surface px-4 pb-3 text-fg-muted">Por pagar</td>
                {duePerMonth.map((v, i) => (
                  <td
                    key={i}
                    className={`px-1 pb-3 text-center ${periods[i] < currentPeriod && v > 0 ? "text-red-600" : "text-fg-muted"}`}
                  >
                    {v > 0 ? v.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "—"}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 px-4 py-3 text-[11px] font-semibold text-fg-muted">
        <Legend cls="bg-emerald-500" label="Pagado" />
        <Legend cls="bg-red-500" label="Vencido (deuda)" />
        <Legend cls="bg-amber-400" label="Por vencer" />
        <Legend cls="bg-bg-alt ring-1 ring-border" label="Pendiente" />
        <span className="ml-auto">Haz clic en una celda para registrar o ver el pago de ese mes.</span>
      </div>
    </div>
  );
}

function GroupRows({
  category,
  rows,
  periods,
  today,
  onOpen,
}: {
  category: (typeof DEBT_CATEGORIES)[number];
  rows: DebtRow[];
  periods: string[];
  today: string;
  onOpen: (debt: DebtRow, period: string) => void;
}) {
  const info = CATEGORY_INFO[category];
  return (
    <>
      <tr>
        <td colSpan={14} className="sticky left-0 bg-bg-alt/60 px-4 py-1.5">
          <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-fg-muted">
            <span className={`h-2 w-2 rounded-full ${info.dot}`} /> {info.label}
          </span>
        </td>
      </tr>
      {rows.map((d) => {
        const states = periods.map((p) => periodState(d, p, today));
        const total = states.reduce((s, st) => s + (st.payment?.amount ?? 0), 0);
        return (
          <tr key={d.id} className={`group/row ${d.active ? "" : "opacity-50"}`}>
            <td className="sticky left-0 z-10 max-w-[260px] border-b border-border/40 bg-bg-surface px-4 py-2 group-hover/row:bg-bg-alt">
              <p className="truncate text-[13px] font-bold text-fg" title={d.name}>
                {d.name}
              </p>
              <p className="truncate text-[11px] text-fg-muted">
                Día {d.dueDay} · {money(d.amount)}
                {d.isVariable ? " aprox." : ""}
              </p>
            </td>
            {states.map((st) => (
              <td key={st.period} className="border-b border-border/40 px-1 py-2 text-center group-hover/row:bg-bg-alt/50">
                <button
                  type="button"
                  disabled={st.status === "NO_APLICA"}
                  onClick={() => onOpen(d, st.period)}
                  title={cellTitle(st)}
                  className={`mx-auto flex h-8 w-full min-w-[52px] max-w-[64px] items-center justify-center rounded-lg text-[10px] font-extrabold transition-all active:scale-95 ${CELL[st.status]}`}
                >
                  {st.status === "PAGADO" ? (
                    <span className="flex items-center gap-0.5">
                      <Check size={11} strokeWidth={3} />
                      {Math.round(st.payment!.amount)}
                    </span>
                  ) : st.status === "NO_APLICA" ? (
                    "·"
                  ) : (
                    Math.round(st.expected)
                  )}
                </button>
              </td>
            ))}
            <td className="border-b border-border/40 px-3 py-2 text-right text-xs font-extrabold text-fg group-hover/row:bg-bg-alt/50">
              {total > 0 ? money(total) : "—"}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function cellTitle(st: PeriodState): string {
  if (st.status === "PAGADO" && st.payment)
    return `Pagado ${money(st.payment.amount)} el ${st.payment.paidAt.split("-").reverse().join("/")} (${st.payment.method})`;
  if (st.status === "VENCIDO") return `Vencido · ${money(st.expected)}`;
  if (st.status === "POR_VENCER") return `Por vencer · ${money(st.expected)}`;
  if (st.status === "PENDIENTE") return `Pendiente · ${money(st.expected)}`;
  return "No aplica";
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${cls}`} /> {label}
    </span>
  );
}
