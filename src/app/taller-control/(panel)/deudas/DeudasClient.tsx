"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  BellRing,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Grid3x3,
  Hash,
  History,
  LayoutList,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { deleteDebt, toggleDebtActive } from "./actions";
import {
  CATEGORY_INFO,
  DEBT_CATEGORIES,
  arrearsBefore,
  dueText,
  fmtDate,
  money,
  paymentWhatsappLink,
  periodLabel,
  periodState,
  shiftPeriod,
  summarizeMonth,
  type DebtCategory,
  type DebtRow,
  type PeriodState,
} from "./deudas";
import { DebtFormModal } from "./DebtFormModal";
import { PaymentModal } from "./PaymentModal";
import { DebtYearMatrix } from "./DebtYearMatrix";

type StatusFilter = "todos" | "pendientes" | "vencidos" | "pagados";
type View = "mes" | "anual";

const STATUS_BADGE: Record<PeriodState["status"], string> = {
  PAGADO: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  VENCIDO: "bg-red-600 text-white ring-red-600 shadow-sm shadow-red-600/30",
  POR_VENCER: "bg-amber-400/20 text-amber-800 ring-amber-500/40 dark:text-amber-300",
  PENDIENTE: "bg-bg-alt text-fg-muted ring-border",
  NO_APLICA: "bg-bg-alt text-fg-muted/60 ring-border",
};

export function DeudasClient({
  debts,
  period,
  view,
  today,
}: {
  debts: DebtRow[];
  period: string;
  view: View;
  today: string;
}) {
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [category, setCategory] = useState<DebtCategory | "ALL">("ALL");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<DebtRow | "new" | null>(null);
  const [paying, setPaying] = useState<{ debtId: string; period: string } | null>(null);
  const [toastOpen, setToastOpen] = useState(true);

  const currentPeriod = today.slice(0, 7);
  const isCurrent = period === currentPeriod;
  const year = Number(period.slice(0, 4));

  const visibleDebts = useMemo(() => debts.filter((d) => showInactive || d.active), [debts, showInactive]);
  const summary = useMemo(() => summarizeMonth(visibleDebts, period, today), [visibleDebts, period, today]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleDebts
      .map((d) => ({ d, st: periodState(d, period, today), arrears: arrearsBefore(d, period, today) }))
      .filter(({ d, st }) => {
        if (category !== "ALL" && d.category !== category) return false;
        if (q) {
          const hay = [d.name, d.payee, d.location, d.reference, d.payTo, d.notes].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (view === "anual") return true;
        if (st.status === "NO_APLICA") return status === "todos" && !d.active;
        if (status === "pendientes") return st.status !== "PAGADO";
        if (status === "vencidos") return st.status === "VENCIDO";
        if (status === "pagados") return st.status === "PAGADO";
        return true;
      })
      .sort((a, b) => a.st.dueDate.localeCompare(b.st.dueDate) || a.d.name.localeCompare(b.d.name));
  }, [visibleDebts, period, today, query, category, status, view]);

  // Alertas reales de HOY (independientes del mes que se esté mirando)
  const urgent = useMemo(
    () =>
      debts
        .filter((d) => d.active)
        .map((d) => ({ d, st: periodState(d, currentPeriod, today) }))
        .filter(({ st }) => st.status === "VENCIDO" || st.status === "POR_VENCER")
        .sort((a, b) => a.st.daysLeft - b.st.daysLeft),
    [debts, currentPeriod, today]
  );

  useEffect(() => {
    if (!toastOpen || urgent.length === 0) return;
    const t = setTimeout(() => setToastOpen(false), 4500);
    return () => clearTimeout(t);
  }, [toastOpen, urgent.length]);

  const upcoming = useMemo(
    () =>
      visibleDebts
        .map((d) => ({ d, st: periodState(d, period, today) }))
        .filter(({ st }) => st.status === "VENCIDO" || st.status === "POR_VENCER" || st.status === "PENDIENTE")
        .sort((a, b) => a.st.dueDate.localeCompare(b.st.dueDate))
        .slice(0, 6),
    [visibleDebts, period, today]
  );

  const payingDebt = paying ? debts.find((d) => d.id === paying.debtId) ?? null : null;
  const counts = {
    todos: rows.length,
    pendientes: visibleDebts.filter((d) => {
      const s = periodState(d, period, today).status;
      return s !== "PAGADO" && s !== "NO_APLICA";
    }).length,
    vencidos: summary.overdueCount,
    pagados: summary.paidCount,
  };

  const href = (p: string, v: View = view) => ({ pathname: "/taller-control/deudas", query: { mes: p, vista: v } });
  const progress = summary.total > 0 ? Math.min(100, (summary.paid / summary.total) * 100) : 0;

  return (
    <div className="mt-6 space-y-6">
      {/* ── Toast de vencimientos ─────────────────────────────────────── */}
      {toastOpen && urgent.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(92vw,380px)]">
          <div
            role="alert"
            className="cobranza-toast pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-red-400/50 bg-red-600 p-4 text-white shadow-2xl shadow-red-900/40"
          >
            <div className="animate-dismiss-bar absolute bottom-0 left-0 h-1 bg-white/60" />
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <BellRing size={18} className="animate-pulse" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {urgent.length === 1 ? urgent[0].d.name : `${urgent.length} pagos requieren atención`}
              </p>
              <p className="mt-0.5 text-xs text-white/90">
                {urgent.length === 1
                  ? `${dueText(urgent[0].st.daysLeft)} · ${money(urgent[0].d.amount)}`
                  : `${urgent.filter((u) => u.st.status === "VENCIDO").length} vencidos y ${
                      urgent.filter((u) => u.st.status === "POR_VENCER").length
                    } por vencer este mes.`}
              </p>
              <Link
                href={href(currentPeriod, "mes")}
                onClick={() => {
                  setStatus("pendientes");
                  setToastOpen(false);
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50"
              >
                <AlertTriangle size={13} /> Ver pendientes
              </Link>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setToastOpen(false)}
              className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Barra superior: mes + vista + nueva ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={href(shiftPeriod(period, view === "anual" ? -12 : -1))}
            className="rounded-xl border border-border bg-bg-surface p-2.5 text-fg-muted shadow-sm transition-colors hover:border-accent hover:text-accent"
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-[170px] rounded-xl border border-border bg-bg-surface px-4 py-2 text-center shadow-sm">
            <p className="font-display text-base font-extrabold capitalize text-fg">
              {view === "anual" ? `Año ${year}` : periodLabel(period)}
            </p>
            {!isCurrent && view === "mes" && (
              <Link href={href(currentPeriod)} className="text-[10px] font-bold text-accent hover:underline">
                Ir al mes actual
              </Link>
            )}
            {isCurrent && view === "mes" && <p className="text-[10px] font-bold text-emerald-600">Mes actual</p>}
          </div>
          <Link
            href={href(shiftPeriod(period, view === "anual" ? 12 : 1))}
            className="rounded-xl border border-border bg-bg-surface p-2.5 text-fg-muted shadow-sm transition-colors hover:border-accent hover:text-accent"
            aria-label="Siguiente"
          >
            <ChevronRight size={18} />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-bg-surface p-1 shadow-sm">
            <Link
              href={href(period, "mes")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                view === "mes" ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-fg"
              }`}
            >
              <LayoutList size={14} /> Mes
            </Link>
            <Link
              href={href(period, "anual")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                view === "anual" ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-fg"
              }`}
            >
              <Grid3x3 size={14} /> Año ENE–DIC
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-transform hover:opacity-95 active:scale-95"
          >
            <Plus size={16} /> Nueva obligación
          </button>
        </div>
      </div>

      {/* ── Tarjetas resumen ──────────────────────────────────────────── */}
      {view === "mes" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={`Total ${periodLabel(period, true)}`}
              value={money(summary.total)}
              sub={`${summary.applicableCount} obligaciones del mes`}
              gradient="from-[#0a5fdb] to-[#4f46e5]"
            />
            <SummaryCard
              label="Pagado"
              value={money(summary.paid)}
              sub={`${summary.paidCount} de ${summary.applicableCount} pagos · ${progress.toFixed(0)}%`}
              gradient="from-emerald-500 to-teal-600"
              progress={progress}
            />
            <SummaryCard
              label="Pendiente"
              value={money(summary.pending)}
              sub={`${summary.applicableCount - summary.paidCount} por pagar${
                summary.dueSoonCount ? ` · ${summary.dueSoonCount} por vencer` : ""
              }`}
              gradient="from-amber-500 to-orange-600"
            />
            <SummaryCard
              label="Deuda vencida"
              value={money(summary.overdue + summary.arrears)}
              sub={
                summary.arrearsCount > 0
                  ? `${summary.overdueCount} este mes + ${summary.arrearsCount} de meses anteriores`
                  : `${summary.overdueCount} pagos vencidos`
              }
              gradient={summary.overdue + summary.arrears > 0 ? "from-red-600 to-rose-700" : "from-slate-500 to-slate-700"}
              pulse={summary.overdue + summary.arrears > 0}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Distribución por categoría */}
            <div className="admin-glass rounded-[var(--radius-lg)] p-5 lg:col-span-3">
              <h2 className="font-display text-sm font-bold text-fg">¿En qué se va el dinero este mes?</h2>
              {summary.total > 0 ? (
                <>
                  <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-bg-alt">
                    {summary.byCategory.map((c) => (
                      <div
                        key={c.category}
                        title={`${CATEGORY_INFO[c.category].label}: ${money(c.total)}`}
                        style={{ width: `${(c.total / summary.total) * 100}%`, background: CATEGORY_INFO[c.category].bar }}
                        className="h-full transition-all first:rounded-l-full last:rounded-r-full"
                      />
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {summary.byCategory.map((c) => {
                      const pct = c.total > 0 ? (c.paid / c.total) * 100 : 0;
                      return (
                        <button
                          key={c.category}
                          type="button"
                          onClick={() => setCategory((prev) => (prev === c.category ? "ALL" : c.category))}
                          className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                            category === c.category ? "border-accent bg-accent/5" : "border-border/60 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-bold text-fg">
                              <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_INFO[c.category].dot}`} />
                              {CATEGORY_INFO[c.category].label}
                            </span>
                            <span className="font-extrabold text-fg">{money(c.total)}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-alt">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-[10px] font-semibold text-fg-muted">
                            Pagado {money(c.paid)} · {pct.toFixed(0)}%
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-fg-muted">Aún no hay obligaciones para este mes.</p>
              )}
            </div>

            {/* Próximos vencimientos */}
            <div className="admin-glass rounded-[var(--radius-lg)] p-5 lg:col-span-2">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold text-fg">
                <Clock size={15} className="text-accent" /> Próximos vencimientos
              </h2>
              <ul className="mt-3 space-y-1.5">
                {upcoming.map(({ d, st }) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setPaying({ debtId: d.id, period })}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-bg-alt"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-extrabold leading-none ${
                          st.status === "VENCIDO"
                            ? "bg-red-600 text-white"
                            : st.status === "POR_VENCER"
                              ? "bg-amber-400 text-amber-950"
                              : "bg-bg-alt text-fg"
                        }`}
                      >
                        <span className="text-sm">{st.dueDate.slice(8)}</span>
                        {periodLabel(period, true).slice(0, 3)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-fg">{d.name}</span>
                        <span
                          className={`block text-[11px] font-semibold ${
                            st.status === "VENCIDO" ? "text-red-600" : "text-fg-muted"
                          }`}
                        >
                          {dueText(st.daysLeft)}
                        </span>
                      </span>
                      <span className="text-xs font-extrabold text-fg">{money(d.amount)}</span>
                    </button>
                  </li>
                ))}
                {upcoming.length === 0 && (
                  <li className="rounded-xl bg-emerald-500/10 px-3 py-4 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    🎉 Todo pagado en {periodLabel(period)}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────── */}
      <div className="admin-glass flex flex-col gap-3 rounded-[var(--radius-lg)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, local, código, beneficiario…"
              className="admin-field w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-fg"
            />
          </div>
          {view === "mes" &&
            (["todos", "pendientes", "vencidos", "pagados"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold capitalize transition-all ${
                  status === s
                    ? s === "vencidos"
                      ? "bg-red-600 text-white shadow-sm"
                      : s === "pagados"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-accent text-accent-fg shadow-sm"
                    : "border border-border/80 bg-bg-surface/80 text-fg-muted hover:text-fg"
                }`}
              >
                {s} {s !== "todos" && `(${counts[s]})`}
              </button>
            ))}
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-fg-muted">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
            Mostrar archivadas
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("ALL")}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 transition-all ${
              category === "ALL" ? "bg-fg text-bg ring-fg" : "text-fg-muted ring-border hover:text-fg"
            }`}
          >
            Todas
          </button>
          {DEBT_CATEGORIES.filter((c) => debts.some((d) => d.category === c)).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory((prev) => (prev === c ? "ALL" : c))}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 transition-all ${
                category === c ? `${CATEGORY_INFO[c].chip} ring-2` : "text-fg-muted ring-border hover:text-fg"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${CATEGORY_INFO[c].dot}`} />
              {CATEGORY_INFO[c].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido principal ───────────────────────────────────────── */}
      {view === "anual" ? (
        <DebtYearMatrix
          debts={rows.map((r) => r.d)}
          year={year}
          today={today}
          onOpen={(d, p) => setPaying({ debtId: d.id, period: p })}
        />
      ) : (
        <div className="admin-glass overflow-hidden rounded-[var(--radius-lg)]">
          <div className="admin-thead hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_auto] gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-fg-muted lg:grid">
            <span>Obligación</span>
            <span>Vencimiento</span>
            <span>Monto</span>
            <span>Estado / pago</span>
            <span className="w-[200px] text-right">Acciones</span>
          </div>
          <ul className="divide-y divide-border/50">
            {rows.map(({ d, st, arrears }) => (
              <DebtLine
                key={d.id}
                debt={d}
                st={st}
                arrears={arrears}
                onPay={(p) => setPaying({ debtId: d.id, period: p })}
                onEdit={() => setEditing(d)}
                onToggle={() => startTransition(async () => void (await toggleDebtActive(d.id)))}
                onDelete={() => {
                  const n = d.payments.length;
                  if (
                    confirm(
                      `¿Eliminar "${d.name}"?${n ? `\n\nSe borrará también su historial de ${n} pago(s). Si solo dejó de pagarse, mejor usa "Archivar".` : ""}`
                    )
                  )
                    startTransition(async () => void (await deleteDebt(d.id)));
                }}
              />
            ))}
            {rows.length === 0 && (
              <li className="px-5 py-14 text-center">
                <CalendarDays size={32} className="mx-auto text-fg-muted/40" />
                <p className="mt-3 text-sm font-semibold text-fg-muted">
                  {debts.length === 0
                    ? "Aún no registras obligaciones. Crea la primera con «Nueva obligación»."
                    : status === "vencidos"
                      ? "¡Excelente! No hay pagos vencidos en este mes."
                      : "No hay obligaciones que coincidan con el filtro."}
                </p>
              </li>
            )}
          </ul>
        </div>
      )}

      {editing && (
        <DebtFormModal
          debt={editing === "new" ? null : editing}
          defaultMonth={period}
          onClose={() => setEditing(null)}
        />
      )}
      {paying && payingDebt && (
        <PaymentModal
          key={`${paying.debtId}-${paying.period}`}
          debt={payingDebt}
          period={paying.period}
          today={today}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  gradient,
  progress,
  pulse,
}: {
  label: string;
  value: string;
  sub: string;
  gradient: string;
  progress?: number;
  pulse?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br ${gradient} p-5 text-white shadow-lg transition-transform duration-300 hover:-translate-y-1`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/10" />
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/85">
        {pulse && <span className="h-2 w-2 animate-pulse rounded-full bg-white" />}
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-white/80">{sub}</p>
      {progress !== undefined && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function DebtLine({
  debt: d,
  st,
  arrears,
  onPay,
  onEdit,
  onToggle,
  onDelete,
}: {
  debt: DebtRow;
  st: PeriodState;
  arrears: PeriodState[];
  onPay: (period: string) => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const info = CATEGORY_INFO[d.category];
  const wa = paymentWhatsappLink(d, st);
  const paid = st.status === "PAGADO";

  const copy = async () => {
    if (!d.reference) return;
    try {
      await navigator.clipboard.writeText(d.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* sin portapapeles */
    }
  };

  return (
    <li
      className={`relative grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-bg-alt/60 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_auto] lg:items-center lg:gap-4 ${
        st.status === "VENCIDO" ? "bg-red-500/[0.06]" : ""
      } ${d.active ? "" : "opacity-55"}`}
    >
      <span className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ background: info.bar }} />

      {/* Obligación */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-bold text-fg">{d.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${info.chip}`}>{info.label}</span>
          {d.location && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-bg-alt px-2 py-0.5 text-[10px] font-bold text-fg-muted ring-1 ring-border">
              <MapPin size={10} /> {d.location}
            </span>
          )}
          {!d.active && (
            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-fg-muted">Archivada</span>
          )}
          {d.endMonth && (
            <span className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-bold text-fuchsia-700 dark:text-fuchsia-300">
              hasta {periodLabel(d.endMonth, true)}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-fg-muted">
          {[d.payee, d.payTo].filter(Boolean).join(" · ") || "—"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {d.reference && (
            <button
              type="button"
              onClick={copy}
              title="Copiar código de pago"
              className="inline-flex items-center gap-1 rounded-md bg-bg-alt px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-fg ring-1 ring-border hover:ring-accent"
            >
              <Hash size={10} /> {d.reference}
              {copied ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} className="opacity-50" />}
            </button>
          )}
          {d.notes && (
            <span
              title={d.notes}
              className="inline-flex max-w-[280px] items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300"
            >
              <StickyNote size={10} className="shrink-0" /> <span className="truncate">{d.notes}</span>
            </span>
          )}
          {arrears.length > 0 && (
            <button
              type="button"
              onClick={() => onPay(arrears[0].period)}
              title={`Meses sin pagar: ${arrears.map((a) => periodLabel(a.period, true)).join(", ")}`}
              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10.5px] font-extrabold text-white shadow-sm hover:bg-red-700"
            >
              <History size={10} /> {arrears.length} mes{arrears.length > 1 ? "es" : ""} atrasado
              {arrears.length > 1 ? "s" : ""} · {money(arrears.reduce((s, a) => s + a.expected, 0))}
            </button>
          )}
        </div>
      </div>

      {/* Vencimiento */}
      <div className="flex items-center gap-2 lg:block">
        <p className="text-sm font-bold text-fg">{fmtDate(st.dueDate)}</p>
        <p className="text-[11px] font-semibold text-fg-muted">Día {d.dueDay} de cada mes</p>
      </div>

      {/* Monto */}
      <div className="flex items-center gap-2 lg:block">
        <p className={`font-display text-base font-extrabold ${paid ? "text-emerald-600" : "text-fg"}`}>
          {money(paid ? st.payment!.amount : d.amount)}
        </p>
        {d.isVariable && !paid && <p className="text-[10px] font-bold text-amber-600">aprox. · varía</p>}
        {paid && st.payment!.amount !== d.amount && (
          <p className="text-[10px] font-semibold text-fg-muted">ref. {money(d.amount)}</p>
        )}
      </div>

      {/* Estado */}
      <div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${STATUS_BADGE[st.status]}`}>
          {st.status === "PAGADO"
            ? "✓ Pagado"
            : st.status === "NO_APLICA"
              ? "No aplica"
              : dueText(st.daysLeft)}
        </span>
        {paid && (
          <p className="mt-1 text-[11px] font-semibold text-fg-muted">
            {fmtDate(st.payment!.paidAt)} · {st.payment!.method}
            {st.payment!.inCashbox && <span className="ml-1 text-accent">· en Caja</span>}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-start gap-1 lg:w-[200px] lg:justify-end">
        {st.status !== "NO_APLICA" &&
          (paid ? (
            <button
              type="button"
              onClick={() => onPay(st.period)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <ReceiptText size={14} /> Ver
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onPay(st.period)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition-transform hover:opacity-95 active:scale-95"
            >
              <Check size={14} /> Pagar
            </button>
          ))}
        {wa && paid && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            title="Enviar constancia por WhatsApp"
            className="rounded-full p-2 text-emerald-600 hover:bg-emerald-500/10"
          >
            <MessageCircle size={16} />
          </a>
        )}
        <button type="button" title="Editar" onClick={onEdit} className="rounded-full p-2 text-blue-600 hover:bg-blue-500/10">
          <Pencil size={15} />
        </button>
        <button
          type="button"
          title={d.active ? "Archivar (ya no se paga)" : "Reactivar"}
          onClick={onToggle}
          className="rounded-full p-2 text-fg-muted hover:bg-bg-alt hover:text-fg"
        >
          {d.active ? <Archive size={15} /> : <ArchiveRestore size={15} />}
        </button>
        <button type="button" title="Eliminar" onClick={onDelete} className="rounded-full p-2 text-red-600 hover:bg-red-500/10">
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}
