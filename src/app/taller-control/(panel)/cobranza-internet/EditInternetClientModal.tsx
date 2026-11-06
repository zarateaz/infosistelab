"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Pencil,
  Check,
  Calendar,
  AlertCircle,
  User,
  MessageCircle,
  DollarSign,
  Clock,
  StickyNote,
  Building2,
  Router,
  Network,
  QrCode,
  Sparkles,
} from "lucide-react";
import { updateInternetClientDirect } from "./internetActions";
import {
  cobranzaState,
  daysUntil,
  directWhatsappLink,
  ROUTERS,
  SWITCH_PORTS,
  type InternetClientRow,
} from "./cobranza";

function cleanPhoneForInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("51")) {
    return digits.slice(2);
  }
  return digits;
}

export function EditInternetClientModal({
  client,
  onClose,
}: {
  client: InternetClientRow;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clientCode, setClientCode] = useState(client.clientCode ?? "");
  const [clientName, setClientName] = useState(client.clientName);
  const [whatsapp, setWhatsapp] = useState(cleanPhoneForInput(client.whatsapp));
  const [galeria, setGaleria] = useState(client.galeria ?? "");
  const [router, setRouter] = useState(client.router ?? "");
  const [portNumber, setPortNumber] = useState<number | string>(
    client.portNumber && client.portNumber >= 1 && client.portNumber <= 16 ? client.portNumber : ""
  );
  const [startDate, setStartDate] = useState(client.startDate);
  const [nextPaymentDate, setNextPaymentDate] = useState(client.nextPaymentDate);
  const [amount, setAmount] = useState<number | string>(client.amount > 0 ? client.amount : "");
  const [concept, setConcept] = useState(client.concept ?? "");

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Cálculo en vivo del estado según la fecha de pago seleccionada
  const days = daysUntil(nextPaymentDate);
  const st = cobranzaState(days);

  const handleGenerateCode = () => {
    if (router && portNumber) {
      const rNum = router.replace(/\D/g, "") || "1";
      const pNum = String(portNumber).padStart(2, "0");
      setClientCode(`R${rNum}-P${pNum}`);
    } else {
      const random = Math.floor(100 + Math.random() * 900);
      setClientCode(`CLI-${random}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await updateInternetClientDirect(client.id, {
        clientCode: clientCode.trim() || null,
        clientName: clientName.trim(),
        whatsapp: whatsapp.trim(),
        galeria: galeria.trim() || null,
        router: router || null,
        portNumber: portNumber ? Number(portNumber) : null,
        startDate,
        nextPaymentDate,
        amount: Number(amount) || 0,
        concept: concept.trim(),
      });

      if (!res.ok) {
        setError(res.error || "Ocurrió un error al guardar los cambios.");
      } else {
        onClose();
      }
    });
  };

  const advanceOneMonth = () => {
    const [y, m, d] = nextPaymentDate.split("-").map(Number);
    if (!y || !m || !d) return;
    const date = new Date(Date.UTC(y, m - 1, d));
    const nextY = date.getUTCFullYear();
    const nextM = date.getUTCMonth() + 1;
    const lastDayNext = new Date(Date.UTC(nextY, nextM + 1, 0)).getUTCDate();
    const newDate = new Date(Date.UTC(nextY, nextM, Math.min(date.getUTCDate(), lastDayNext)));
    const yStr = newDate.getUTCFullYear();
    const mStr = String(newDate.getUTCMonth() + 1).padStart(2, "0");
    const dStr = String(newDate.getUTCDate()).padStart(2, "0");
    setNextPaymentDate(`${yStr}-${mStr}-${dStr}`);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white text-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-slate-200/90 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-client-title"
      >
        {/* Cabecera Blanco Puro con Icono Gradiente */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <Pencil size={19} />
            </div>
            <div>
              <h3 id="edit-client-title" className="text-base font-extrabold tracking-tight text-slate-900">
                Editar Cliente de Internet
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Modifica los datos del cliente, red (Router/Puerto), galería y WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-40"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Fila 1: Código del cliente y Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5" htmlFor="edit-code">
                  <QrCode size={13} className="text-indigo-600" /> Código
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="text-[10px] font-bold text-accent hover:underline flex items-center gap-0.5"
                  title="Autogenerar código"
                >
                  <Sparkles size={10} /> Auto
                </button>
              </div>
              <input
                id="edit-code"
                maxLength={50}
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                className="w-full uppercase rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 shadow-2xs"
                placeholder="Ej. R1-P04"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5" htmlFor="edit-name">
                <User size={13} className="text-blue-600" /> Nombre del Cliente
              </label>
              <input
                id="edit-name"
                required
                maxLength={150}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 shadow-2xs"
                placeholder="Ej: Computienda / Juan Pérez"
              />
            </div>
          </div>

          {/* Fila 2: Galería / Ubicación */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5" htmlFor="edit-galeria">
              <Building2 size={13} className="text-purple-600" /> Galería donde está ubicado el internet
            </label>
            <input
              id="edit-galeria"
              maxLength={120}
              value={galeria}
              onChange={(e) => setGaleria(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 shadow-2xs"
              placeholder="Ej. Galería Constitución Stand 104, Galería Mercado Modelo, etc."
            />
          </div>

          {/* Fila 3: Router y Puerto del Switch (16 puertos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5" htmlFor="edit-router">
                <Router size={13} className="text-blue-600" /> Router Asignado
              </label>
              <select
                id="edit-router"
                value={router}
                onChange={(e) => setRouter(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-2xs cursor-pointer"
              >
                <option value="">-- Sin asignar --</option>
                {ROUTERS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5" htmlFor="edit-port">
                <Network size={13} className="text-indigo-600" /> Puerto del Switch (1 al 16)
              </label>
              <select
                id="edit-port"
                value={portNumber}
                onChange={(e) => setPortNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-2xs cursor-pointer"
              >
                <option value="">-- Sin puerto --</option>
                {SWITCH_PORTS.map((p) => (
                  <option key={p} value={p}>
                    Puerto {p} {p <= 8 ? "(Fila Superior)" : "(Fila Inferior)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 4: WhatsApp y Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5" htmlFor="edit-wa">
                  <MessageCircle size={13} className="text-emerald-600" /> WhatsApp
                </label>
                {whatsapp && (
                  <a
                    href={directWhatsappLink(whatsapp, clientName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Abrir Chat</span>
                  </a>
                )}
              </div>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200/90 bg-slate-100 px-3 text-xs font-bold text-slate-600 select-none">
                  +51
                </span>
                <input
                  id="edit-wa"
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-r-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 shadow-2xs"
                  placeholder="900 000 000"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5" htmlFor="edit-amount">
                <DollarSign size={13} className="text-amber-600" /> Monto Mensual (S/.)
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200/90 bg-slate-100 px-3 text-xs font-bold text-slate-600 select-none">
                  S/.
                </span>
                <input
                  id="edit-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-r-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 shadow-2xs"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Fila 5: Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5" htmlFor="edit-start">
                <Calendar size={13} className="text-blue-600" /> Fecha de Inicio
              </label>
              <input
                id="edit-start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5" htmlFor="edit-pay">
                  <Clock size={13} className="text-indigo-600" /> Próximo Pago
                </label>
                <button
                  type="button"
                  onClick={advanceOneMonth}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 px-2 py-0.5 text-[10px] font-bold transition-all shadow-2xs active:scale-95"
                  title="Avanzar un mes a la fecha seleccionada"
                >
                  <Calendar size={10} /> +1 Mes
                </button>
              </div>
              <input
                id="edit-pay"
                type="date"
                required
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 shadow-2xs"
              />
            </div>
          </div>

          {/* Fila 6: Concepto / nota */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5" htmlFor="edit-concept">
              <StickyNote size={13} className="text-amber-600" /> Concepto / nota
              <span className="ml-auto text-[10px] font-semibold normal-case tracking-normal text-slate-400">{concept.length}/200</span>
            </label>
            <textarea
              id="edit-concept"
              rows={2}
              maxLength={200}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 shadow-2xs"
              placeholder="Ej: Pagó 3 meses por adelantado (hasta enero)"
            />
          </div>

          {/* Tarjeta de Estado en Vivo */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span>Estado según fecha:</span>
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold shadow-2xs ${
                st === "ok"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300/80"
                  : days === 0
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-red-600 text-white shadow-sm shadow-red-600/30"
              }`}
            >
              {st === "ok"
                ? `Al día · faltan ${days} días`
                : days === 0
                ? "Vence HOY"
                : days < 0
                ? `Venció hace ${-days} días`
                : `Vence en ${days} días`}
            </span>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !clientName.trim() || !whatsapp.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-sm shadow-blue-600/25 active:scale-95 disabled:opacity-50"
            >
              <Check size={15} />
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
