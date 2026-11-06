"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AccountRow } from "./actions";

function bucket(rows: AccountRow[]) {
  const pending = rows.filter((r) => r.status === "PENDIENTE" || r.status === "POR VENCER").reduce((s, r) => s + r.saldo, 0);
  const overdue = rows.filter((r) => r.status === "VENCIDO").reduce((s, r) => s + r.saldo, 0);
  const paid = rows.reduce((s, r) => s + r.settled, 0);
  return { pending, overdue, paid };
}

export function AccountsChart({ receivables, payables }: { receivables: AccountRow[]; payables: AccountRow[] }) {
  const r = bucket(receivables);
  const p = bucket(payables);

  const data = [
    { name: "Por Cobrar", Pagado: r.paid, Pendiente: r.pending, Vencido: r.overdue },
    { name: "Por Pagar", Pagado: p.paid, Pendiente: p.pending, Vencido: p.overdue },
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,48,0.06)" vertical={false} />
          <XAxis dataKey="name" stroke="#56607a" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#56607a" fontSize={11} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            formatter={(value) => `S/. ${Number(value).toFixed(2)}`}
            contentStyle={{ borderRadius: 12, border: "1px solid rgba(11,18,48,0.08)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Pagado" stackId="a" fill="#0a5fdb" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Pendiente" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Vencido" stackId="a" fill="#dc2626" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
