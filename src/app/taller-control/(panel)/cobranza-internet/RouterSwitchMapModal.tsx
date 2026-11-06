"use client";

import { useState } from "react";
import {
  X,
  Router,
  Network,
  Building2,
  MessageCircle,
  CheckCircle2,
  User,
  ExternalLink,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  ROUTERS,
  SWITCH_PORTS,
  TOTAL_SWITCH_PORTS,
  directWhatsappLink,
  type InternetClientRow,
} from "./cobranza";

interface RouterSwitchMapModalProps {
  clients: InternetClientRow[];
  onClose: () => void;
  onEditClient: (client: InternetClientRow) => void;
  onAssignPort?: (router: string, port: number) => void;
}

export function RouterSwitchMapModal({
  clients,
  onClose,
  onEditClient,
  onAssignPort,
}: RouterSwitchMapModalProps) {
  const [selectedRouter, setSelectedRouter] = useState<string>("Router 1");

  // Map of occupied ports: Key = `${router}-${portNumber}` -> InternetClientRow
  const occupiedMap = new Map<string, InternetClientRow>();
  for (const c of clients) {
    if (c.router && c.portNumber) {
      occupiedMap.set(`${c.router}-${c.portNumber}`, c);
    }
  }

  // Summary statistics
  const totalCapacity = ROUTERS.length * TOTAL_SWITCH_PORTS; // 5 * 16 = 80
  const totalOccupied = Array.from(occupiedMap.keys()).length;
  const totalFree = totalCapacity - totalOccupied;

  const currentRouterOccupied = SWITCH_PORTS.filter((p) =>
    occupiedMap.has(`${selectedRouter}-${p}`)
  ).length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white text-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-slate-200/90 flex flex-col animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25">
              <Network size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                  Mapa de Routers y Puertos de Red
                </h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-200/80">
                  5 Routers · 16 Puertos c/u
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Control visual de puertos ocupados, clientes conectados, galerías y puertos libres
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen Superior */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 border-b border-slate-100 text-xs">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Capacidad Total
            </span>
            <p className="mt-0.5 text-lg font-black text-slate-900">{totalCapacity} Puertos</p>
            <p className="text-[10px] text-slate-400">5 Switches de 16 Pts</p>
          </div>
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Puertos en Uso
            </span>
            <p className="mt-0.5 text-lg font-black text-blue-700">{totalOccupied} Clientes</p>
            <p className="text-[10px] text-blue-600">
              {((totalOccupied / totalCapacity) * 100).toFixed(0)}% ocupación
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Puertos Libres
            </span>
            <p className="mt-0.5 text-lg font-black text-emerald-700">{totalFree} Disponibles</p>
            <p className="text-[10px] text-emerald-600">Listos para conectar</p>
          </div>
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              En {selectedRouter}
            </span>
            <p className="mt-0.5 text-lg font-black text-indigo-700">
              {currentRouterOccupied} / {TOTAL_SWITCH_PORTS}
            </p>
            <p className="text-[10px] text-indigo-600">
              {TOTAL_SWITCH_PORTS - currentRouterOccupied} libres en este switch
            </p>
          </div>
        </div>

        {/* Selector de Routers (Pestañas de los 5 Routers) */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 overflow-x-auto pb-2">
          {ROUTERS.map((r) => {
            const occ = SWITCH_PORTS.filter((p) => occupiedMap.has(`${r}-${p}`)).length;
            const active = selectedRouter === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRouter(r)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102"
                    : "border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Router size={15} />
                <span>{r}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {occ}/16
                </span>
              </button>
            );
          })}
        </div>

        {/* Panel del Switch Físico de 16 Puertos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-3xl border-2 border-slate-800 bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-200">
                  SWITCH GIGABIT 16-PORT · {selectedRouter.toUpperCase()}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                16 PUERTOS RJ45 10/100/1000 Mbps
              </span>
            </div>

            {/* Parrilla de los 16 Puertos (2 Filas de 8 Puertos como un Switch real) */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
              {SWITCH_PORTS.map((port) => {
                const client = occupiedMap.get(`${selectedRouter}-${port}`);
                const isOccupied = !!client;

                return (
                  <div
                    key={port}
                    onClick={() => {
                      if (client) {
                        onEditClient(client);
                      } else if (onAssignPort) {
                        onAssignPort(selectedRouter, port);
                      }
                    }}
                    className={`group/port relative cursor-pointer rounded-2xl p-2.5 border transition-all text-center flex flex-col justify-between min-h-[92px] ${
                      isOccupied
                        ? "border-blue-500/60 bg-blue-950/60 hover:bg-blue-900/80 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20"
                        : "border-slate-800 bg-slate-950/50 hover:bg-slate-800/80 hover:border-emerald-500/60"
                    }`}
                  >
                    {/* Header del puerto: LED + Número */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOccupied
                            ? "bg-blue-400 shadow-[0_0_6px_#60a5fa] animate-pulse"
                            : "bg-emerald-500 shadow-[0_0_6px_#10b981]"
                        }`}
                      />
                      <span className="font-mono text-[11px] font-black text-slate-300">
                        P{port}
                      </span>
                    </div>

                    {/* RJ-45 visual connector icon */}
                    <div className="my-1.5 flex justify-center">
                      <div
                        className={`h-5 w-7 rounded-sm border flex items-center justify-center text-[9px] font-mono font-bold ${
                          isOccupied
                            ? "border-blue-400/60 bg-blue-500/20 text-blue-200"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                        }`}
                      >
                        RJ45
                      </div>
                    </div>

                    {/* Info del Cliente o Libre */}
                    {isOccupied && client ? (
                      <div className="truncate">
                        <p className="truncate text-[10px] font-bold text-white leading-tight">
                          {client.clientName}
                        </p>
                        <p className="truncate text-[9px] font-mono text-blue-300">
                          {client.clientCode || `P${port}`}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-400">Libre</p>
                        <p className="text-[9px] text-slate-500">Disponible</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista detallada de clientes en este router */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <Network size={15} className="text-indigo-600" />
              <span>Clientes conectados a {selectedRouter} ({currentRouterOccupied} de 16)</span>
            </h4>

            {currentRouterOccupied === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 text-xs">
                Este router aún no tiene clientes asignados. Los 16 puertos están disponibles.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SWITCH_PORTS.filter((p) => occupiedMap.has(`${selectedRouter}-${p}`)).map((port) => {
                  const client = occupiedMap.get(`${selectedRouter}-${port}`)!;
                  return (
                    <div
                      key={port}
                      className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-md bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 text-[10px] font-mono font-black text-indigo-700">
                              Puerto {port}
                            </span>
                            {client.clientCode && (
                              <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                                {client.clientCode}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-bold text-sm text-slate-900">{client.clientName}</p>
                          {client.galeria && (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-purple-700 font-semibold">
                              <Building2 size={12} /> {client.galeria}
                            </p>
                          )}
                        </div>

                        <span className="text-right font-display text-sm font-black text-slate-900">
                          {client.amount > 0 ? `S/. ${client.amount.toFixed(2)}` : "S/. 0.00"}
                        </span>
                      </div>

                      {/* Botones rápidos: WhatsApp y Editar */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <span className="text-[11px] font-mono text-slate-500">+{client.whatsapp}</span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={directWhatsappLink(client.whatsapp, client.clientName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-bold transition-all shadow-2xs"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => onEditClient(client)}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100"
                            title="Editar datos del cliente"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

