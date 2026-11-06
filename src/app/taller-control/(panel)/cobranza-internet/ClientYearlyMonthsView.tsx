"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Edit3,
  X,
  MessageCircle,
} from "lucide-react";
import {
  getYearMonthsInfo,
  parsePaidMonths,
  whatsappLink,
  type InternetClientRow,
  type MonthUIInfo,
} from "./cobranza";
import {
  toggleInternetClientMonth,
  payAdvanceInternetMonths,
  updateInternetMonthDetails,
} from "./internetActions";

interface ClientYearlyMonthsViewProps {
  client: InternetClientRow;
  today: Date;
  onClose?: () => void;
}

export function ClientYearlyMonthsView({
  client,
  today,
  onClose,
}: ClientYearlyMonthsViewProps) {
  const currentRealYear = today.getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);
  const [isPending, startTransition] = useTransition();

  // Estado para edición individual de un mes
  const [editingMonthKey, setEditingMonthKey] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(client.amount);
  const [editMethod, setEditMethod] = useState<string>("YAPE");
  const [editNote, setEditNote] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Mapa reactivo de meses
  const paidMonthsMap = parsePaidMonths(
    client.paidMonths,
    client.startDate,
    client.nextPaymentDate,
    client.amount
  );

  const yearInfo = getYearMonthsInfo(
    selectedYear,
    paidMonthsMap,
    today,
    client.amount
  );

  const handleToggleMonth = (m: MonthUIInfo) => {
    startTransition(async () => {
      const res = await toggleInternetClientMonth(client.id, m.key, {
        paid: !m.isPaid,
        amount: client.amount,
        method: "YAPE",
        note: !m.isPaid ? "Marcado desde panel anual" : undefined,
      });
      if (res.ok) {
        showToast(
          !m.isPaid
            ? `✓ ${m.monthName} marcado como PAGADO`
            : `Mes ${m.monthName} desmarcado (pendiente)`
        );
      }
    });
  };

  const handleAdvancePay = (monthsCount: number) => {
    startTransition(async () => {
      const res = await payAdvanceInternetMonths(client.id, monthsCount, {
        amountPerMonth: client.amount,
        method: "YAPE",
        note: `Adelanto de ${monthsCount} meses`,
      });
      if (res.ok) {
        showToast(`🎉 ¡${res.countPaid ?? monthsCount} mes(es) pagados por adelantado! Próximo pago actualizado.`);
      }
    });
  };

  const handleSaveMonthDetails = (key: string, isCurrentlyPaid: boolean) => {
    startTransition(async () => {
      const res = await updateInternetMonthDetails(client.id, key, {
        status: isCurrentlyPaid ? "paid" : "unpaid",
        amount: editAmount,
        method: editMethod,
        note: editNote.trim() || undefined,
      });
      if (res.ok) {
        setEditingMonthKey(null);
        showToast("✓ Detalles del mes actualizados correctamente.");
      }
    });
  };

  const openMonthEditor = (m: MonthUIInfo) => {
    setEditingMonthKey(m.key);
    setEditAmount(m.amount ?? client.amount);
    setEditMethod(m.method || "YAPE");
    setEditNote(m.note || "");
  };

  return (
    <div className="rounded-2xl border border-accent/30 bg-bg-surface/95 p-4 sm:p-6 shadow-xl backdrop-blur-md transition-all">
      {/* Toast de retroalimentación flotante en el panel */}
      {toastMsg && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md animate-fade-in">
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="rounded p-0.5 hover:bg-white/20"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Cabecera del Panel Anual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Calendar size={16} />
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-fg">
              Control de Pagos Mes a Mes:{" "}
              <span className="text-accent underline decoration-accent/40">{client.clientName}</span>
            </h3>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            Haz clic en cualquier mes para marcarlo como pagado o pendiente. La próxima fecha de pago se sincroniza automáticamente.
          </p>
        </div>

        {/* Navegador de Año */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-xl border border-border/80 bg-bg-alt p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-surface hover:text-fg transition-colors"
              title="Año anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-black text-fg">{selectedYear}</span>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-surface hover:text-fg transition-colors"
              title="Año siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {selectedYear !== currentRealYear && (
            <button
              type="button"
              onClick={() => setSelectedYear(currentRealYear)}
              className="rounded-xl border border-border px-2.5 py-1.5 text-xs font-bold text-fg-muted hover:text-fg hover:bg-bg-alt"
            >
              Año Actual ({currentRealYear})
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border/80 p-2 text-fg-muted hover:bg-bg-alt hover:text-fg"
              title="Cerrar vista anual"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Métricas y Acciones Rápidas Pro */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-border/50 bg-bg-alt/50 p-3.5">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-400">
            <Check size={14} /> {yearInfo.paidCount} pagados en {selectedYear}
          </span>
          {yearInfo.advanceCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 px-2.5 py-1 font-extrabold text-blue-700 dark:text-blue-300">
              <Sparkles size={13} /> {yearInfo.advanceCount} por adelantado
            </span>
          )}
          {yearInfo.overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1 font-bold text-red-600">
              <AlertTriangle size={13} /> {yearInfo.overdueCount} meses impagos
            </span>
          )}
          <span className="font-semibold text-fg-muted">
            Total recaudado: <strong className="text-fg">S/. {yearInfo.totalCollected.toFixed(2)}</strong>
          </span>
        </div>

        {/* Botones de acción rápida: ¡Pagar 2 meses adelantados! */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAdvancePay(2)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all disabled:opacity-60"
            title="Paga automáticamente los próximos 2 meses pendientes y actualiza la fecha de próximo pago"
          >
            <Zap size={13} className="text-amber-300" />
            + Pagar 2 meses adelantados
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAdvancePay(1)}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-surface px-3 py-1.5 text-xs font-bold text-fg hover:bg-bg-alt active:scale-95 transition-all disabled:opacity-60"
            title="Paga 1 mes adelantado"
          >
            + 1 mes
          </button>
        </div>
      </div>

      {/* Grid de los 12 Meses: Enero a Diciembre */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {yearInfo.months.map((m) => {
          const isEditing = editingMonthKey === m.key;

          // Clases dinámicas según el estado del mes
          let cardStyle = "border-border/70 bg-bg-surface hover:border-border-strong";
          let badgeClass = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

          if (m.badgeStyle === "advance") {
            cardStyle =
              "border-blue-500/40 bg-blue-500/10 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/30";
            badgeClass = "bg-blue-600 text-white font-extrabold";
          } else if (m.badgeStyle === "paid") {
            cardStyle =
              "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/40 shadow-sm";
            badgeClass = "bg-emerald-600 text-white font-extrabold";
          } else if (m.badgeStyle === "overdue") {
            cardStyle =
              "border-red-500/40 bg-red-500/10 dark:bg-red-950/40 shadow-sm ring-1 ring-red-500/30";
            badgeClass = "bg-red-600 text-white font-extrabold animate-pulse";
          } else if (m.badgeStyle === "due") {
            cardStyle =
              "border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/30 shadow-sm ring-1 ring-amber-500/40";
            badgeClass = "bg-amber-500 text-white font-extrabold";
          }

          return (
            <div
              key={m.key}
              className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${cardStyle}`}
            >
              <div>
                {/* Cabecera de la tarjeta del mes */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-fg-muted">
                      {String(m.monthNum).padStart(2, "0")}
                    </span>
                    <h4 className="font-display text-sm font-black text-fg">
                      {m.monthName}
                    </h4>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${badgeClass}`}
                  >
                    {m.badgeText}
                  </span>
                </div>

                {/* Monto y Detalle */}
                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold text-fg-muted">Monto:</span>
                    <span
                      className={`text-base font-black ${
                        m.isPaid
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-fg"
                      }`}
                    >
                      S/. {(m.amount ?? client.amount).toFixed(2)}
                    </span>
                  </div>

                  {m.isPaid ? (
                    <div className="mt-1 space-y-0.5 text-[11px] text-fg-muted">
                      {m.paidAt && (
                        <p className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Pagado: {m.paidAt}</span>
                        </p>
                      )}
                      {m.method && (
                        <p className="font-semibold text-fg">Método: {m.method}</p>
                      )}
                      {m.note && (
                        <p className="italic text-[10px] text-fg-muted truncate" title={m.note}>
                          “{m.note}”
                        </p>
                      )}
                    </div>
                  ) : m.isOverdue ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-red-600">
                      <AlertTriangle size={11} /> Mes vencido sin abonar
                    </p>
                  ) : m.isDueThisMonth ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-600">
                      <Clock size={11} /> Corresponde cobrar este mes
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-fg-muted">Mes futuro</p>
                  )}
                </div>
              </div>

              {/* Formulario Inline de Edición de detalles */}
              {isEditing ? (
                <div className="mt-3 border-t border-border/60 pt-2.5 space-y-2 animate-fade-in">
                  <div>
                    <label className="text-[10px] font-bold text-fg-muted uppercase">Monto (S/.)</label>
                    <input
                      type="number"
                      step={0.5}
                      value={editAmount}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
                      className="admin-field mt-0.5 w-full rounded-lg px-2 py-1 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-fg-muted uppercase">Método</label>
                    <select
                      value={editMethod}
                      onChange={(e) => setEditMethod(e.target.value)}
                      className="admin-field mt-0.5 w-full rounded-lg px-2 py-1 text-xs text-fg"
                    >
                      <option value="YAPE">Yape</option>
                      <option value="PLIN">Plin</option>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-fg-muted uppercase">Nota / Detalle</label>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Ej. Yape del titular"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="admin-field mt-0.5 w-full rounded-lg px-2 py-1 text-xs text-fg"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSaveMonthDetails(m.key, m.isPaid)}
                      className="flex-1 rounded-lg bg-accent py-1 text-xs font-bold text-white hover:opacity-90"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMonthKey(null)}
                      className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-fg-muted hover:bg-bg-alt"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* Botones de Acción de la tarjeta */
                <div className="mt-3.5 flex items-center justify-between gap-1.5 border-t border-border/50 pt-2.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleMonth(m)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-2 text-xs font-bold transition-all active:scale-95 ${
                      m.isPaid
                        ? "border border-border/80 bg-bg-surface text-fg-muted hover:border-red-500/40 hover:text-red-600"
                        : m.isOverdue
                          ? "bg-red-600 text-white shadow-sm hover:bg-red-700"
                          : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                    }`}
                  >
                    {m.isPaid ? (
                      <span>Desmarcar</span>
                    ) : (
                      <>
                        <Check size={13} />
                        <span>Marcar Pagado</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openMonthEditor(m)}
                    className="rounded-xl border border-border/80 p-1.5 text-fg-muted hover:bg-bg-alt hover:text-fg transition-colors"
                    title="Editar monto, método o nota de este mes"
                  >
                    <Edit3 size={13} />
                  </button>

                  {m.isOverdue && (
                    <a
                      href={whatsappLink(client, -15)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl p-1.5 text-emerald-600 hover:bg-emerald-500/10"
                      title="Enviar recordatorio de WhatsApp por este mes"
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
