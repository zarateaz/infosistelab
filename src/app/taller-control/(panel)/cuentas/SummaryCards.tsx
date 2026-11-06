import type { AccountRow } from "./actions";

function sumSaldo(rows: AccountRow[]) {
  return rows.reduce((sum, r) => sum + r.saldo, 0);
}

function sumOverdue(rows: AccountRow[]) {
  return rows.filter((r) => r.status === "VENCIDO").reduce((sum, r) => sum + r.saldo, 0);
}

export function SummaryCards({ receivables, payables }: { receivables: AccountRow[]; payables: AccountRow[] }) {
  const porCobrar = sumSaldo(receivables);
  const porPagar = sumSaldo(payables);
  const vencidoCobrar = sumOverdue(receivables);
  const vencidoPagar = sumOverdue(payables);
  const neto = porCobrar - porPagar;

  const cards = [
    {
      label: "Por cobrar",
      value: porCobrar,
      sub: `${receivables.filter((r) => r.saldo > 0).length} cuentas pendientes`,
      gradient: "from-[#0a5fdb] to-[#1080ff]",
    },
    {
      label: "Por pagar",
      value: porPagar,
      sub: `${payables.filter((p) => p.saldo > 0).length} cuentas pendientes`,
      gradient: "from-[#7c3aed] to-[#a855f7]",
    },
    {
      label: "Vencido (cobrar)",
      value: vencidoCobrar,
      sub: `${receivables.filter((r) => r.status === "VENCIDO").length} vencidas`,
      gradient: "from-[#dc2626] to-[#f87171]",
    },
    {
      label: "Vencido (pagar)",
      value: vencidoPagar,
      sub: `${payables.filter((p) => p.status === "VENCIDO").length} vencidas`,
      gradient: "from-[#b45309] to-[#f59e0b]",
    },
    {
      label: "Balance neto",
      value: neto,
      sub: neto >= 0 ? "A tu favor" : "A favor de terceros",
      gradient: neto >= 0 ? "from-[#0f9d58] to-[#34d399]" : "from-[#4b5563] to-[#9ca3af]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br ${c.gradient} p-5 text-white shadow-[0_12px_32px_-12px_rgba(10,30,80,0.45)]`}
        >
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/10" />
          <p className="text-xs font-bold uppercase tracking-wider text-white/80">{c.label}</p>
          <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">
            S/. {c.value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-white/75">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
