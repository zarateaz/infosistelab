"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { AdminTransaction } from "./actions";
import type { PaymentMethodType } from "./constants";

export type ChartFilterMode = "ALL" | "COMPARE" | PaymentMethodType;

interface CajaChartProps {
  transactions: AdminTransaction[];
  activeFilter?: ChartFilterMode;
  onFilterChange?: (mode: ChartFilterMode) => void;
}

const LINE_COLORS: Record<string, string> = {
  ALL: "#0a5fdb",
  EFECTIVO: "#10b981",
  "YAPE 1": "#742284",
  "YAPE 2": "#c026d3",
};

export function CajaChart({ transactions, activeFilter, onFilterChange }: CajaChartProps) {
  const [internalMode, setInternalMode] = useState<ChartFilterMode>("ALL");
  const mode = activeFilter ?? internalMode;

  const handleMode = (next: ChartFilterMode) => {
    setInternalMode(next);
    onFilterChange?.(next);
  };

  interface ChartPoint {
    date: string;
    method: string;
    balance: number;
    EFECTIVO: number;
    "YAPE 1": number;
    "YAPE 2": number;
    value?: number;
    desc?: string;
  }

  const points = useMemo<ChartPoint[]>(() => {
    let totalBal = 0;
    let cashBal = 0;
    let yape1Bal = 0;
    let yape2Bal = 0;

    return transactions.map((t) => {
      const delta = t.type === "INCOME" ? t.amount : -t.amount;
      totalBal += delta;
      if (t.paymentMethod === "EFECTIVO") cashBal += delta;
      else if (t.paymentMethod === "YAPE 1") yape1Bal += delta;
      else if (t.paymentMethod === "YAPE 2") yape2Bal += delta;

      return {
        date: new Date(t.date).toLocaleDateString("es-PE", {
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
        }),
        method: t.paymentMethod,
        balance: Number(totalBal.toFixed(2)),
        EFECTIVO: Number(cashBal.toFixed(2)),
        "YAPE 1": Number(yape1Bal.toFixed(2)),
        "YAPE 2": Number(yape2Bal.toFixed(2)),
      };
    });
  }, [transactions]);

  // If filtering by a specific single account, only plot points where that account had activity
  // (or show its progression across its own movements so the curve is clean).
  const singleMethodPoints = useMemo<ChartPoint[]>(() => {
    if (mode !== "EFECTIVO" && mode !== "YAPE 1" && mode !== "YAPE 2") return points;
    let running = 0;
    return transactions
      .filter((t) => t.paymentMethod === mode)
      .map((t) => {
        running += t.type === "INCOME" ? t.amount : -t.amount;
        const val = Number(running.toFixed(2));
        return {
          date: new Date(t.date).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            timeZone: "UTC",
          }),
          method: t.paymentMethod,
          balance: val,
          EFECTIVO: mode === "EFECTIVO" ? val : 0,
          "YAPE 1": mode === "YAPE 1" ? val : 0,
          "YAPE 2": mode === "YAPE 2" ? val : 0,
          value: val,
          desc: t.description,
        };
      });
  }, [transactions, mode, points]);

  const filterButtons: { id: ChartFilterMode; label: string; dotColor?: string }[] = [
    { id: "ALL", label: "Saldo General", dotColor: "#0a5fdb" },
    { id: "COMPARE", label: "Comparar las 3 cuentas" },
    { id: "EFECTIVO", label: "Efectivo", dotColor: "#10b981" },
    { id: "YAPE 1", label: "Yape 1 (Edgar)", dotColor: "#742284" },
    { id: "YAPE 2", label: "Yape 2 (Caja)", dotColor: "#c026d3" },
  ];

  const isSingleAccount = mode === "EFECTIVO" || mode === "YAPE 1" || mode === "YAPE 2";
  const activeDataset = isSingleAccount ? singleMethodPoints : points;

  return (
    <div>
      {/* Selector de vista del gráfico */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {filterButtons.map((btn) => {
          const active = mode === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => handleMode(btn.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                active
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "border border-border bg-bg-alt/70 text-fg-muted hover:border-accent/50 hover:text-fg"
              }`}
            >
              {btn.dotColor && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? "#ffffff" : btn.dotColor }}
                />
              )}
              <span>{btn.label}</span>
            </button>
          );
        })}
      </div>

      {activeDataset.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-fg-muted">
          {isSingleAccount
            ? `No hay movimientos registrados en ${mode} para este período.`
            : "Registra movimientos para ver la evolución del saldo."}
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activeDataset} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#56607a" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#56607a" fontSize={11} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                formatter={(value, name) => [
                  `S/. ${Number(value).toFixed(2)}`,
                  name === "balance"
                    ? "Saldo General"
                    : name === "value"
                    ? `Saldo ${mode}`
                    : String(name),
                ]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(11,18,48,0.12)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              {mode === "COMPARE" && (
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  formatter={(value) => (
                    <span className="font-bold text-fg">
                      {value === "EFECTIVO"
                        ? "Efectivo (Caja Física)"
                        : value === "YAPE 1"
                        ? "Yape 1 (Edgar)"
                        : "Yape 2 (Caja)"}
                    </span>
                  )}
                />
              )}

              {mode === "ALL" && (
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={LINE_COLORS.ALL}
                  strokeWidth={2.5}
                  dot={false}
                />
              )}

              {mode === "COMPARE" && (
                <>
                  <Line
                    type="monotone"
                    dataKey="EFECTIVO"
                    stroke={LINE_COLORS.EFECTIVO}
                    strokeWidth={2.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="YAPE 1"
                    stroke={LINE_COLORS["YAPE 1"]}
                    strokeWidth={2.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="YAPE 2"
                    stroke={LINE_COLORS["YAPE 2"]}
                    strokeWidth={2.2}
                    dot={false}
                  />
                </>
              )}

              {isSingleAccount && (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={LINE_COLORS[mode]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: LINE_COLORS[mode] }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
