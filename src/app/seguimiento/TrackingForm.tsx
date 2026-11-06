"use client";

import { useState } from "react";
import { Search, Loader2, PackageSearch, Wrench, CheckCircle2, AlertCircle } from "lucide-react";
import { trackRepairsByDni, type PublicRepairStatus } from "./actions";

function formatDateTime(date: Date): string {
  const d = new Date(date);
  const datePart = d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
  const timePart = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

/** Purely cosmetic bucket from the numeric progress — statusText is the
 *  real, admin-set label always shown alongside this; the icon just gives
 *  a quick visual read at a glance. */
function stageIcon(progress: number) {
  if (progress >= 100) return CheckCircle2;
  if (progress >= 40) return Wrench;
  return PackageSearch;
}

function RepairCard({ repair }: { repair: PublicRepairStatus }) {
  const Icon = stageIcon(repair.progress);
  const done = repair.progress >= 100;

  return (
    <div className="glass-panel relative overflow-hidden rounded-[var(--radius-lg)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              done ? "bg-accent/15 text-accent" : "bg-accent/10 text-accent"
            }`}
          >
            <Icon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-fg-muted">
              Orden {repair.code}
            </p>
            <p className="font-display text-base font-bold text-fg">{repair.equipment}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-fg">
          {repair.progress}%
        </span>
      </div>

      <p className="mt-4 text-sm text-fg-muted">{repair.problem}</p>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-fg">
          <span>{repair.statusText}</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-bg">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent via-accent-hover to-accent transition-[width] duration-500 ease-out"
            style={{ width: `${repair.progress}%` }}
          >
            <div className="absolute inset-0 animate-[shimmer_1.6s_linear_infinite] bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.6)_50%,transparent_70%)] bg-[length:200%_100%]" />
          </div>
          {repair.progress > 0 && (
            <div
              aria-hidden
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_14px_3px_rgba(10,95,219,0.7)] transition-[left] duration-500 ease-out"
              style={{ left: `calc(${repair.progress}% - 6px)` }}
            />
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-fg-muted">Última actualización: {formatDateTime(repair.lastUpdate)}</p>
    </div>
  );
}

export function TrackingForm() {
  const [dni, setDni] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "found"; repairs: PublicRepairStatus[] }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "loading" });
    try {
      const result = await trackRepairsByDni(dni);
      if (result.error) {
        setStatus({ kind: "error", message: result.error });
        return;
      }
      setStatus({ kind: "found", repairs: result.repairs ?? [] });
    } catch {
      setStatus({ kind: "error", message: "No se pudo consultar. Revisa tu conexión e intenta de nuevo." });
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-3 rounded-[var(--radius-lg)] p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Tu DNI (8 dígitos)"
            className="w-full rounded-full border border-border bg-bg py-3.5 pl-11 pr-4 text-sm font-semibold tracking-wide text-fg outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={status.kind === "loading" || dni.length !== 8}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-accent-fg transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status.kind === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {status.kind === "loading" ? "Buscando…" : "Consultar"}
        </button>
      </form>

      {status.kind === "error" && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          {status.message}
        </div>
      )}

      {status.kind === "found" && (
        <div className="space-y-4">
          {status.repairs.map((r) => (
            <RepairCard key={r.code} repair={r} />
          ))}
        </div>
      )}
    </div>
  );
}
