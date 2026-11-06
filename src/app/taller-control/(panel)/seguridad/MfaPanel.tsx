"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { beginEnrollment, confirmEnrollment, disableMfa, regenerateRecoveryCodes } from "./actions";

type Phase = "idle" | "enrolling" | "confirming-disable" | "confirming-regenerate";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-fg-muted transition-colors hover:text-fg"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function RecoveryCodesCard({ codes }: { codes: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
        Guarda estos códigos de recuperación
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        Cada uno funciona una sola vez, por si pierdes acceso a tu app de autenticación. No se
        volverán a mostrar.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-fg">
        {codes.map((c) => (
          <div key={c} className="rounded-lg bg-bg px-3 py-1.5">
            {c}
          </div>
        ))}
      </div>
      <div className="mt-3">
        <CopyButton text={codes.join("\n")} />
      </div>
    </div>
  );
}

export function MfaPanel({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [phase, setPhase] = useState<Phase>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetWizard() {
    setPhase("idle");
    setQrDataUrl(null);
    setManualKey(null);
    setCode("");
    setError(null);
  }

  function handleStartEnrollment() {
    setError(null);
    startTransition(async () => {
      const result = await beginEnrollment();
      setQrDataUrl(result.qrDataUrl);
      setManualKey(result.manualKey);
      setPhase("enrolling");
    });
  }

  function handleConfirmEnrollment() {
    setError(null);
    startTransition(async () => {
      const result = await confirmEnrollment(code);
      if (result.error) return setError(result.error);
      setEnabled(true);
      setRecoveryCodes(result.recoveryCodes ?? null);
      resetWizard();
    });
  }

  function handleDisable() {
    setError(null);
    startTransition(async () => {
      const result = await disableMfa(code);
      if (result.error) return setError(result.error);
      setEnabled(false);
      setRecoveryCodes(null);
      resetWizard();
    });
  }

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateRecoveryCodes(code);
      if (result.error) return setError(result.error);
      setRecoveryCodes(result.recoveryCodes ?? null);
      resetWizard();
    });
  }

  return (
    <div className="admin-glass rounded-[var(--radius-lg)] p-6">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            enabled ? "bg-accent/10 text-accent" : "bg-bg-raised text-fg-muted"
          }`}
        >
          {enabled ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
        </div>
        <div>
          <p className="text-sm font-bold text-fg">
            {enabled ? "Verificación en dos pasos activada" : "Verificación en dos pasos desactivada"}
          </p>
          <p className="text-xs text-fg-muted">
            {enabled
              ? "Se te pedirá un código además de tu contraseña al iniciar sesión."
              : "Recomendado antes de operar pagos o facturación electrónica."}
          </p>
        </div>
      </div>

      {phase === "idle" && !enabled && (
        <button
          onClick={handleStartEnrollment}
          disabled={isPending}
          className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-fg transition-opacity disabled:opacity-60"
        >
          {isPending ? "Generando..." : "Activar verificación en dos pasos"}
        </button>
      )}

      {phase === "enrolling" && qrDataUrl && manualKey && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-bg p-4 sm:flex-row">
            <Image src={qrDataUrl} alt="Código QR de verificación" width={160} height={160} unoptimized />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                Escanéalo con Google Authenticator, Authy, etc.
              </p>
              <p className="mt-1 text-xs text-fg-muted">O ingresa esta clave manualmente:</p>
              <p className="mt-1 break-all font-mono text-xs text-fg">{manualKey}</p>
              <div className="mt-2">
                <CopyButton text={manualKey} />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-code" className="text-xs font-bold uppercase tracking-wider text-fg-muted">
              Código de 6 dígitos
            </label>
            <input
              id="confirm-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="mt-2 w-full max-w-[200px] rounded-xl border border-border bg-bg px-4 py-2.5 text-sm tracking-widest text-fg outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleConfirmEnrollment}
              disabled={isPending || code.length < 6}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-fg transition-opacity disabled:opacity-60"
            >
              {isPending ? "Verificando..." : "Confirmar y activar"}
            </button>
            <button
              onClick={resetWizard}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-fg-muted transition-colors hover:text-fg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {enabled && phase === "idle" && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setError(null);
              setCode("");
              setPhase("confirming-regenerate");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-fg transition-colors hover:bg-bg-raised"
          >
            <KeyRound size={13} />
            Regenerar códigos de recuperación
          </button>
          <button
            onClick={() => {
              setError(null);
              setCode("");
              setPhase("confirming-disable");
            }}
            className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/5"
          >
            Desactivar
          </button>
        </div>
      )}

      {(phase === "confirming-disable" || phase === "confirming-regenerate") && (
        <div className="mt-5 space-y-3">
          <div>
            <label htmlFor="confirm-current-code" className="text-xs font-bold uppercase tracking-wider text-fg-muted">
              Confirma con tu código actual
            </label>
            <input
              id="confirm-current-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="mt-2 w-full max-w-[200px] rounded-xl border border-border bg-bg px-4 py-2.5 text-sm tracking-widest text-fg outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={phase === "confirming-disable" ? handleDisable : handleRegenerate}
              disabled={isPending || code.length < 6}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-opacity disabled:opacity-60 ${
                phase === "confirming-disable" ? "bg-red-600 text-white" : "bg-accent text-accent-fg"
              }`}
            >
              {isPending ? "Verificando..." : phase === "confirming-disable" ? "Desactivar" : "Regenerar"}
            </button>
            <button
              onClick={resetWizard}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-fg-muted transition-colors hover:text-fg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {recoveryCodes && <RecoveryCodesCard codes={recoveryCodes} />}
    </div>
  );
}
