"use client";

import { Fragment, useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BellRing,
  MessageCircle,
  Wifi,
  X,
  Check,
  Trash2,
  Users,
  AlertTriangle,
  Pencil,
  StickyNote,
  Calendar,
  ChevronDown,
  Sparkles,
  Building2,
  Router,
  Network,
  QrCode,
  Search,
  Filter,
} from "lucide-react";
import {
  createInternetClient,
  markInternetPaid,
  deleteInternetClient,
  type InternetFormState,
} from "./internetActions";
import {
  cobranzaState,
  daysUntil,
  whatsappLink,
  directWhatsappLink,
  parsePaidMonths,
  getYearMonthsInfo,
  ROUTERS,
  SWITCH_PORTS,
  type InternetClientRow,
} from "./cobranza";
import { EditInternetClientModal } from "./EditInternetClientModal";
import { ClientYearlyMonthsView } from "./ClientYearlyMonthsView";
import { RouterSwitchMapModal } from "./RouterSwitchMapModal";

const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";
const inputClass = "admin-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm text-fg";
const initialState: InternetFormState = {};

function fmt(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function dayText(days: number) {
  if (days < 0) return `venció hace ${-days} día${days === -1 ? "" : "s"}`;
  if (days === 0) return "vence HOY";
  if (days === 1) return "vence mañana";
  return `vence en ${days} días`;
}

export function CobranzaInternet({ clients }: { clients: InternetClientRow[] }) {
  const [state, formAction, isPending] = useActionState(createInternetClient, initialState);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [tab, setTab] = useState<"all" | "deudores">("all");
  const [editingClient, setEditingClient] = useState<InternetClientRow | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);

  // Filtros de búsqueda, router y galería
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRouter, setFilterRouter] = useState<string>("ALL");
  const [filterGaleria, setFilterGaleria] = useState<string>("ALL");

  // Estado para autogenerar código en el formulario
  const [newRouter, setNewRouter] = useState<string>("");
  const [newPort, setNewPort] = useState<string>("");
  const [newCode, setNewCode] = useState<string>("");

  // `today` se fija tras montar para no desfasar hidratación (servidor en UTC, navegador en Lima).
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  useEffect(() => {
    if (!state.error && !isPending) {
      formRef.current?.reset();
      setNewRouter("");
      setNewPort("");
      setNewCode("");
    }
  }, [state, isPending]);

  // Lista única de galerías para el filtro
  const uniqueGalerias = useMemo(() => {
    const set = new Set<string>();
    for (const c of clients) {
      if (c.galeria?.trim()) set.add(c.galeria.trim());
    }
    return Array.from(set).sort();
  }, [clients]);

  // Auto-completar código si seleccionan router y puerto
  const handleRouteChange = (rVal: string) => {
    setNewRouter(rVal);
    if (rVal && newPort && !newCode) {
      const rNum = rVal.replace(/\D/g, "") || "1";
      const pNum = String(newPort).padStart(2, "0");
      setNewCode(`R${rNum}-P${pNum}`);
    }
  };

  const handlePortChange = (pVal: string) => {
    setNewPort(pVal);
    if (newRouter && pVal && !newCode) {
      const rNum = newRouter.replace(/\D/g, "") || "1";
      const pNum = String(pVal).padStart(2, "0");
      setNewCode(`R${rNum}-P${pNum}`);
    }
  };

  const rows = today
    ? clients.map((c) => {
        const days = daysUntil(c.nextPaymentDate, today);
        return { c, days, st: cobranzaState(days) };
      })
    : [];
  const alerts = rows.filter((r) => r.st !== "ok");

  // Filtrar según búsqueda, router, galería y tab
  const filteredRows = useMemo(() => {
    let result = tab === "deudores" ? alerts : rows;

    if (filterRouter !== "ALL") {
      result = result.filter((r) => r.c.router === filterRouter);
    }

    if (filterGaleria !== "ALL") {
      result = result.filter((r) => r.c.galeria === filterGaleria);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) => {
        return (
          r.c.clientName.toLowerCase().includes(term) ||
          r.c.whatsapp.includes(term) ||
          (r.c.galeria && r.c.galeria.toLowerCase().includes(term)) ||
          (r.c.clientCode && r.c.clientCode.toLowerCase().includes(term)) ||
          (r.c.router && r.c.router.toLowerCase().includes(term)) ||
          (r.c.concept && r.c.concept.toLowerCase().includes(term))
        );
      });
    }

    return result;
  }, [tab, alerts, rows, filterRouter, filterGaleria, searchTerm]);

  // Auto-desaparecer la notificación flotante luego de 3 segundos exactos
  useEffect(() => {
    if (alerts.length === 0 || dismissed) return;
    const timer = setTimeout(() => {
      setDismissed(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [alerts.length, dismissed]);

  // Si el usuario agrega un cliente nuevo o cambia el estado, reabrir toast brevemente
  const prevAlertsLength = useRef(alerts.length);
  useEffect(() => {
    if (alerts.length > prevAlertsLength.current) {
      setDismissed(false);
    }
    prevAlertsLength.current = alerts.length;
  }, [alerts.length]);

  const singleAlert = alerts.length === 1 ? alerts[0] : null;

  return (
    <section id="cobranza-internet" className="print:hidden mt-10 scroll-mt-6">
      {/* Notificación flotante con auto-cierre en 3 segundos */}
      {!dismissed && alerts.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2">
          {alerts.length === 1 && singleAlert ? (
            <div
              role="alert"
              className="cobranza-toast pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-2xl border border-red-400/50 bg-red-600 p-4 text-white shadow-2xl shadow-red-900/40"
            >
              <div className="absolute bottom-0 left-0 h-1 bg-white/60 animate-dismiss-bar" />
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <BellRing size={18} className="animate-pulse" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{singleAlert.c.clientName}</p>
                <p className="text-xs text-white/90">
                  {singleAlert.st === "vencido"
                    ? "Ya se venció su fecha de pago"
                    : "Se acerca su fecha de pago"}{" "}
                  · {dayText(singleAlert.days)}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <a
                    href={whatsappLink(singleAlert.c, singleAlert.days)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50 shadow-sm"
                  >
                    <MessageCircle size={13} /> Cobrar por WhatsApp
                  </a>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar notificación"
                onClick={() => setDismissed(true)}
                className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              role="alert"
              className="cobranza-toast pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-2xl border border-red-400/50 bg-red-600 p-4 text-white shadow-2xl shadow-red-900/40"
            >
              <div className="absolute bottom-0 left-0 h-1 bg-white/60 animate-dismiss-bar" />
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <AlertTriangle size={18} className="animate-pulse" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Lista de deudores ({alerts.length})</p>
                <p className="text-xs text-white/90 mt-0.5">
                  Hay {alerts.length} clientes con fecha de pago vencida o por vencer.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab("deudores");
                    setDismissed(true);
                    document.getElementById("tabla-cobranza")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50 shadow-sm"
                >
                  <Users size={13} /> Ver lista de deudores
                </button>
              </div>
              <button
                type="button"
                aria-label="Cerrar notificación"
                onClick={() => setDismissed(true)}
                className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="admin-glass rounded-[var(--radius-lg)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-fg">
              <Wifi size={20} className="text-accent" /> Cobranza de internet
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Control de clientes, galerías, routers (1 al 5) y switches de 16 puertos con avisos directos por WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Mapa Visual de Routers y Puertos */}
            <button
              type="button"
              onClick={() => setMapModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/35 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-all active:scale-95 shadow-2xs"
            >
              <Network size={14} />
              <span>Mapa de Routers y Puertos (80 Pts)</span>
            </button>

            {alerts.length > 0 && (
              <button
                type="button"
                onClick={() => setTab((prev) => (prev === "deudores" ? "all" : "deudores"))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-transform active:scale-95 ${
                  tab === "deudores"
                    ? "bg-red-600 text-white shadow-md ring-2 ring-red-400"
                    : "bg-red-600/10 text-red-600 border border-red-500/30 hover:bg-red-600 hover:text-white"
                }`}
              >
                <BellRing size={13} /> {alerts.length} en lista de deudores
              </button>
            )}
          </div>
        </div>

        {/* Formulario de Registro con los nuevos campos de Galería, Router, Puerto y Código */}
        <form ref={formRef} action={formAction} className="mt-5 space-y-4 rounded-2xl border border-border/80 bg-bg-raised/40 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-accent border-b border-border/60 pb-2">
            <Sparkles size={14} />
            <span>Registrar Nuevo Cliente de Internet</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Código Identificador */}
            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass} htmlFor="ic-code">
                  Código (Identificador)
                </label>
                <span className="text-[10px] text-fg-muted font-mono">Ej: R1-P04</span>
              </div>
              <input
                id="ic-code"
                name="clientCode"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                maxLength={50}
                className={`${inputClass} uppercase font-mono font-bold`}
                placeholder="Ej. R1-P08 / CLI-101"
              />
            </div>

            {/* 2. Cliente */}
            <div>
              <label className={labelClass} htmlFor="ic-name">
                Cliente *
              </label>
              <input
                id="ic-name"
                name="clientName"
                required
                maxLength={150}
                className={inputClass}
                placeholder="Ej. Computienda / Juan Pérez"
              />
            </div>

            {/* 3. WhatsApp */}
            <div>
              <label className={labelClass} htmlFor="ic-wa">
                WhatsApp (9 dígitos) *
              </label>
              <div className="mt-1.5 flex">
                <span className="inline-flex items-center rounded-l-xl border border-r-0 border-border bg-bg-raised px-3 text-xs font-bold text-fg-muted select-none">
                  +51
                </span>
                <input
                  id="ic-wa"
                  name="whatsapp"
                  type="tel"
                  required
                  placeholder="900 000 000"
                  className="admin-field w-full rounded-r-xl px-3.5 py-2.5 text-sm text-fg"
                />
              </div>
            </div>

            {/* 4. Nombre de la Galería */}
            <div>
              <label className={labelClass} htmlFor="ic-galeria">
                Galería / Ubicación
              </label>
              <input
                id="ic-galeria"
                name="galeria"
                maxLength={120}
                className={inputClass}
                placeholder="Ej. Galería Constitución Stand 12"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* 5. Router (1 al 5) */}
            <div>
              <label className={labelClass} htmlFor="ic-router">
                Router (1 al 5)
              </label>
              <select
                id="ic-router"
                name="router"
                value={newRouter}
                onChange={(e) => handleRouteChange(e.target.value)}
                className={`${inputClass} cursor-pointer font-bold`}
              >
                <option value="">-- Sin asignar --</option>
                {ROUTERS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Puerto del Switch (1 al 16) */}
            <div>
              <label className={labelClass} htmlFor="ic-port">
                Puerto (Switch 16P)
              </label>
              <select
                id="ic-port"
                name="portNumber"
                value={newPort}
                onChange={(e) => handlePortChange(e.target.value)}
                className={`${inputClass} cursor-pointer font-bold`}
              >
                <option value="">-- Sin puerto --</option>
                {SWITCH_PORTS.map((p) => (
                  <option key={p} value={p}>
                    Puerto {p} {p <= 8 ? "(Superior)" : "(Inferior)"}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Fecha de inicio */}
            <div>
              <label className={labelClass} htmlFor="ic-start">
                Fecha de inicio *
              </label>
              <input id="ic-start" name="startDate" type="date" required className={inputClass} />
            </div>

            {/* 8. Fecha de pago */}
            <div>
              <label className={labelClass} htmlFor="ic-pay">
                Fecha de pago *
              </label>
              <input id="ic-pay" name="nextPaymentDate" type="date" required className={inputClass} />
            </div>

            {/* 9. Monto */}
            <div>
              <label className={labelClass} htmlFor="ic-amount">
                Monto mensual (S/.)
              </label>
              <input
                id="ic-amount"
                name="amount"
                type="number"
                min={0}
                step={0.01}
                className={inputClass}
                placeholder="Ej. 30.00"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="ic-concept">
              Concepto / nota — opcional
            </label>
            <input
              id="ic-concept"
              name="concept"
              maxLength={200}
              placeholder="Ej: Pagó 2 meses por adelantado (hasta diciembre) · Cable azul"
              className={inputClass}
            />
          </div>

          {state.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}

          <div className="pt-1 flex items-center justify-between gap-4">
            <p className="text-xs text-fg-muted">
              * Los campos marcados con asterisco son obligatorios para programar los avisos.
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-accent px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60 shadow-sm active:scale-95"
            >
              {isPending ? "Guardando..." : "Agregar cliente"}
            </button>
          </div>
        </form>

        {/* Barra de Filtros y Búsqueda */}
        <div id="tabla-cobranza" className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                tab === "all"
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "border border-border/80 bg-bg-surface/80 text-fg-muted hover:text-fg"
              }`}
            >
              Todos los clientes ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("deudores")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === "deudores"
                  ? "bg-red-600 text-white shadow-sm"
                  : "border border-red-500/40 bg-red-500/5 text-red-600 hover:bg-red-500/10"
              }`}
            >
              <AlertTriangle size={13} /> Lista de deudores ({alerts.length})
            </button>
          </div>

          {/* Filtros rápidos: Router y Galería */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Router */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-fg-muted font-bold text-[11px]">Router:</span>
              <select
                value={filterRouter}
                onChange={(e) => setFilterRouter(e.target.value)}
                className="rounded-xl border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-fg outline-none"
              >
                <option value="ALL">Todos los routers</option>
                {ROUTERS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Galería */}
            {uniqueGalerias.length > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-fg-muted font-bold text-[11px]">Galería:</span>
                <select
                  value={filterGaleria}
                  onChange={(e) => setFilterGaleria(e.target.value)}
                  className="rounded-xl border border-border bg-bg px-2.5 py-1.5 text-xs font-semibold text-fg outline-none max-w-[160px] truncate"
                >
                  <option value="ALL">Todas las galerías</option>
                  {uniqueGalerias.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Buscador */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, cód, galería..."
                className="rounded-xl border border-border bg-bg pl-8 pr-3 py-1.5 text-xs font-medium text-fg placeholder:text-fg-muted outline-none focus:border-accent w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Clientes con Modo Expandible y Mini-Tracker de 12 Meses */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
                <th className="px-4 py-3">Cliente / Código / Ubicación</th>
                <th className="px-4 py-3">Red (Router y Puerto)</th>
                <th className="px-4 py-3">Inicio</th>
                <th className="px-4 py-3">Próximo pago</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Contacto & Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ c, days, st }) => {
                const isExpanded = expandedClientId === c.id;

                // Mini-tracker para la fila de este cliente
                const clientMap = today
                  ? parsePaidMonths(c.paidMonths, c.startDate, c.nextPaymentDate, c.amount)
                  : {};
                const yearSummary = today
                  ? getYearMonthsInfo(today.getFullYear(), clientMap, today, c.amount)
                  : { months: [], advanceCount: 0 };

                return (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                      className={`cursor-pointer transition-colors border-b border-border/40 hover:bg-bg-alt/70 ${
                        isExpanded
                          ? "bg-accent/5 ring-1 ring-inset ring-accent/30"
                          : st === "ok"
                            ? ""
                            : "bg-red-500/10"
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedClientId(isExpanded ? null : c.id);
                            }}
                            className={`mt-0.5 rounded-lg p-1 transition-transform ${
                              isExpanded ? "bg-accent text-accent-fg rotate-180" : "text-fg-muted hover:bg-bg-surface hover:text-fg"
                            }`}
                            title={isExpanded ? "Cerrar meses" : "Ver meses de enero a diciembre"}
                          >
                            <ChevronDown size={14} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {c.clientCode && (
                                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 text-[10px] font-mono font-black text-indigo-700 dark:text-indigo-300">
                                  {c.clientCode}
                                </span>
                              )}
                              <p className="font-bold text-fg group-hover/row:text-accent transition-colors">
                                {c.clientName}
                              </p>
                              {yearSummary.advanceCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:text-blue-300">
                                  <Sparkles size={11} />
                                  {yearSummary.advanceCount} adel.
                                </span>
                              )}
                            </div>

                            {/* Galería y Monto */}
                            <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs text-fg-muted">
                              {c.galeria ? (
                                <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 font-semibold text-[11px]">
                                  <Building2 size={12} /> {c.galeria}
                                </span>
                              ) : null}
                              <span>
                                {c.amount > 0 ? `· S/. ${c.amount.toFixed(2)} / mes` : "· S/. 0.00"}
                              </span>
                            </div>

                            {c.concept && (
                              <p
                                className="mt-1 inline-flex max-w-[320px] items-start gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                title={c.concept}
                              >
                                <StickyNote size={11} className="mt-0.5 shrink-0" />
                                <span className="truncate">{c.concept}</span>
                              </p>
                            )}

                            {/* Mini-Tracker interactivo de los 12 Meses */}
                            {today && (
                              <div className="mt-2 flex items-center gap-1 flex-wrap">
                                {yearSummary.months.map((m) => (
                                  <span
                                    key={m.key}
                                    title={`${m.monthName} ${today.getFullYear()}: ${m.badgeText}`}
                                    className={`inline-flex items-center justify-center h-4.5 w-5 rounded text-[9px] font-black transition-transform hover:scale-110 shadow-xs ${
                                      m.isAdvance
                                        ? "bg-blue-600 text-white ring-1 ring-blue-400"
                                        : m.isPaid
                                          ? "bg-emerald-600 text-white"
                                          : m.isOverdue
                                            ? "bg-red-600 text-white animate-pulse"
                                            : m.isDueThisMonth
                                              ? "bg-amber-500 text-white"
                                              : "bg-border/60 text-fg-muted dark:bg-border/30"
                                    }`}
                                  >
                                    {m.monthShort.charAt(0)}
                                  </span>
                                ))}
                                <span className="text-[10px] font-bold text-accent ml-1.5 hover:underline">
                                  {isExpanded ? "Ocultar ▲" : "Meses ▼"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Columna de Red: Router y Puerto */}
                      <td className="px-4 py-3.5">
                        {c.router || c.portNumber ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 w-fit">
                              <Router size={13} />
                              <span>{c.router || "Router"}</span>
                            </span>
                            <span className="text-[11px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                              {c.portNumber ? `Puerto ${c.portNumber} de 16` : "Sin puerto asignado"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-fg-muted italic">Sin conexión asignada</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-fg-muted whitespace-nowrap">{fmt(c.startDate)}</td>
                      <td className="px-4 py-3.5 font-bold text-fg whitespace-nowrap">{fmt(c.nextPaymentDate)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            st === "ok"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-600 text-white shadow-sm"
                          }`}
                        >
                          {st === "ok" ? `Al día · ${days} d` : dayText(days)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Botón directo de WhatsApp para contacto */}
                          <a
                            href={directWhatsappLink(c.whatsapp, c.clientName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Contactar a ${c.clientName} (+${c.whatsapp})`}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 text-xs font-bold transition-all shadow-2xs"
                          >
                            <MessageCircle size={13} />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>

                          {/* Botón de cobrar con mensaje prearmado */}
                          <a
                            href={whatsappLink(c, days)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enviar aviso de cobro por WhatsApp"
                            className="rounded-full p-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <MessageCircle size={15} />
                          </a>

                          <button
                            type="button"
                            title="Marcar como pagado (+1 mes)"
                            onClick={() => startTransition(() => markInternetPaid(c.id))}
                            className="rounded-full p-2 text-accent hover:bg-accent/10"
                          >
                            <Check size={16} />
                          </button>

                          <button
                            type="button"
                            title={isExpanded ? "Cerrar meses ENE-DIC" : "Abrir meses ENE-DIC"}
                            onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                            className={`rounded-full p-2 transition-colors ${
                              isExpanded
                                ? "bg-accent text-accent-fg"
                                : "text-indigo-600 hover:bg-indigo-500/10"
                            }`}
                          >
                            <Calendar size={16} />
                          </button>

                          <button
                            type="button"
                            title="Editar datos del cliente (Galería, Router, Puerto, WhatsApp)"
                            onClick={() => setEditingClient(c)}
                            className="rounded-full p-2 text-blue-600 hover:bg-blue-500/10 transition-colors"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            title="Eliminar cliente"
                            onClick={() => {
                              if (confirm(`¿Eliminar a ${c.clientName}?`)) {
                                startTransition(() => deleteInternetClient(c.id));
                              }
                            }}
                            className="rounded-full p-2 text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Fila expandible con el Panel de los 12 Meses ENE-DIC */}
                    {isExpanded && today && (
                      <tr className="bg-accent/5 border-b-2 border-accent/30 animate-fade-in">
                        <td colSpan={6} className="p-3 sm:p-5">
                          <ClientYearlyMonthsView
                            client={c}
                            today={today}
                            onClose={() => setExpandedClientId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
                    {searchTerm || filterRouter !== "ALL" || filterGaleria !== "ALL"
                      ? "No se encontraron clientes que coincidan con los filtros aplicados."
                      : tab === "deudores"
                      ? "¡Excelente! No hay clientes con cobro pendiente o vencido. Todos están al día."
                      : "Aún no hay clientes de internet registrados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edición de Cliente */}
      {editingClient && (
        <EditInternetClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
        />
      )}

      {/* Modal de Mapa de Red de los 5 Routers y sus 16 Puertos */}
      {mapModalOpen && (
        <RouterSwitchMapModal
          clients={clients}
          onClose={() => setMapModalOpen(false)}
          onEditClient={(c) => {
            setMapModalOpen(false);
            setEditingClient(c);
          }}
          onAssignPort={(router, port) => {
            setNewRouter(router);
            setNewPort(String(port));
            const rNum = router.replace(/\D/g, "") || "1";
            setNewCode(`R${rNum}-P${String(port).padStart(2, "0")}`);
            setMapModalOpen(false);
            document.getElementById("ic-name")?.focus();
          }}
        />
      )}
    </section>
  );
}
