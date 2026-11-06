"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck, CheckCircle2, User } from "lucide-react";
import { loginAction, verifyMfaAction, type LoginState } from "./actions";
import { CuriousEyes } from "./CuriousEyes";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const [loginState, loginFormAction, isLoginPending] = useActionState(loginAction, initialState);
  const [mfaState, mfaFormAction, isMfaPending] = useActionState(verifyMfaAction, initialState);
  const [step, setStep] = useState<"password" | "mfa">("password");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Derived-state-during-render, not an effect (React docs' "adjusting
  // state when a prop changes" pattern — a plain useState, not a ref, is
  // the form the lint rules accept for this). useActionState hands back a
  // new object identity each time loginAction resolves, so comparing that
  // identity (not just .mfaRequired) is what lets a second password
  // submission re-enter the MFA step after the user clicked "Volver".
  const [lastHandledLoginState, setLastHandledLoginState] = useState<LoginState | null>(null);
  if (loginState !== lastHandledLoginState) {
    setLastHandledLoginState(loginState);
    if (loginState.mfaRequired) setStep("mfa");
  }

  const state = step === "mfa" ? mfaState : loginState;
  const formAction = step === "mfa" ? mfaFormAction : loginFormAction;
  const isPending = step === "mfa" ? isMfaPending : isLoginPending;

  return (
    <div className="bg-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      {/* Subtle architectural engineering grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#0b1230 1px, transparent 1px), linear-gradient(90deg, #0b1230 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Ambient Infosistel blue corporate glows */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#0a5fdb]/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#2e7ef0]/12 blur-3xl" />

      <div className="relative z-10 w-full max-w-4xl">
        <Link
          href="/"
          className="group mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-fg-muted transition-colors hover:text-accent"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          Volver al inicio
        </Link>

        <div className="relative grid overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_25px_70px_-15px_rgba(10,45,110,0.18)] backdrop-blur-xl ring-1 ring-[#0a5fdb]/10 md:grid-cols-2">
          {/* Decorative corporate brand panel */}
          <div className="relative hidden flex-col items-center justify-between overflow-hidden border-r border-slate-200/80 bg-gradient-to-br from-[#eaf1ff] via-[#f4f8ff] to-[#dce8ff] px-10 py-14 md:flex">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "linear-gradient(#0a5fdb 1px, transparent 1px), linear-gradient(90deg, #0a5fdb 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />
            <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-[#0a5fdb]/15 blur-3xl" />

            <div className="relative flex items-center gap-2 rounded-full border border-[#0a5fdb]/20 bg-white/85 px-4 py-1.5 shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#0a5fdb]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b1230]">
                Consola Corporativa
              </p>
            </div>

            <div className="relative my-auto flex flex-col items-center py-8 text-center">
              <div className="w-full max-w-[260px] transition-transform duration-300 hover:scale-[1.02]">
                <Image
                  src="/brand/infosistel-logo-v3.png"
                  alt="Infosistel"
                  width={1366}
                  height={166}
                  className="h-auto w-full object-contain drop-shadow-[0_12px_28px_rgba(10,95,219,0.18)]"
                  unoptimized
                  priority
                />
              </div>
              <p className="mt-5 max-w-xs text-xs font-medium leading-relaxed text-fg-muted">
                Sistema integral de administración de inventario, facturación electrónica, cotizaciones y servicio técnico.
              </p>
            </div>

            <div className="relative w-full space-y-2 rounded-2xl border border-[#0a5fdb]/15 bg-white/75 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#0b1230]">
                <CheckCircle2 size={15} className="shrink-0 text-[#0a5fdb]" />
                <span>Acceso protegido y auditado</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#0b1230]">
                <CheckCircle2 size={15} className="shrink-0 text-[#0a5fdb]" />
                <span>Gestión en tiempo real — INFOSISTEL</span>
              </div>
            </div>
          </div>

          {/* Form panel */}
          <div className="relative flex flex-col justify-center bg-white px-8 py-12 sm:px-12">
            {/* Top accent bar */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0a5fdb] via-[#2e7ef0] to-[#0a5fdb]" />

            <div className="mb-4 flex items-center justify-between md:hidden">
              <Image
                src="/brand/infosistel-logo-v3.png"
                alt="Infosistel"
                width={1366}
                height={166}
                className="h-6 w-auto object-contain"
                unoptimized
                priority
              />
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf1ff] text-[#0a5fdb]">
                <Lock size={18} strokeWidth={2} />
              </div>
            </div>

            <div className="mb-5">
              <CuriousEyes closed={passwordFocused && !showPassword} />
            </div>

            <div className="text-center md:text-left">
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b1230] sm:text-3xl">
                {step === "mfa" ? "Verificación en dos pasos" : "Panel Administrativo"}
              </h1>
              <p className="mt-1.5 text-sm text-fg-muted">
                {step === "mfa"
                  ? "Ingresa el código de 6 dígitos de tu aplicación de autenticación."
                  : "Ingresa tus credenciales autorizadas para continuar."}
              </p>
            </div>

            {step === "mfa" ? (
              <form action={formAction} className="mt-7 space-y-4">
                <div>
                  <label htmlFor="code" className="block text-xs font-bold uppercase tracking-wider text-[#0b1230]">
                    Código de seguridad
                  </label>
                  <div className="relative mt-2">
                    <ShieldCheck
                      size={18}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0a5fdb]"
                    />
                    <input
                      id="code"
                      name="code"
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      autoFocus
                      required
                      placeholder="123456"
                      className="w-full rounded-xl border-2 border-slate-300 bg-[#f8fafc] px-4 py-3 pl-11 text-sm font-semibold tracking-widest text-[#0b1230] placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#0a5fdb] focus:bg-white focus:ring-4 focus:ring-[#0a5fdb]/15"
                    />
                  </div>
                </div>

                {state.error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />
                    <p>{state.error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a5fdb] py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-6px_rgba(10,95,219,0.45)] transition-all duration-200 hover:bg-[#084bb5] active:scale-[0.99] disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Confirmar acceso</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("password")}
                  className="w-full text-center text-xs font-bold uppercase tracking-wider text-fg-muted transition-colors hover:text-[#0a5fdb]"
                >
                  ← Volver al inicio de sesión
                </button>
              </form>
            ) : (
              <form action={formAction} className="mt-7 space-y-4">
                <div>
                  <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-[#0b1230]">
                    Usuario
                  </label>
                  <div className="relative mt-2">
                    <User
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      placeholder="Ingresa tu usuario"
                      className="w-full rounded-xl border-2 border-slate-300 bg-[#f8fafc] px-4 py-3 pl-10 text-sm font-medium text-[#0b1230] placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#0a5fdb] focus:bg-white focus:ring-4 focus:ring-[#0a5fdb]/15"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[#0b1230]">
                    Contraseña
                  </label>
                  <div className="relative mt-2">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••••••"
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      className="w-full rounded-xl border-2 border-slate-300 bg-[#f8fafc] px-4 py-3 pl-10 pr-11 text-sm font-medium text-[#0b1230] placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#0a5fdb] focus:bg-white focus:ring-4 focus:ring-[#0a5fdb]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#0a5fdb]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {state.error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />
                    <p>{state.error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a5fdb] py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-6px_rgba(10,95,219,0.45)] transition-all duration-200 hover:bg-[#084bb5] active:scale-[0.99] disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Verificando credenciales...</span>
                    </>
                  ) : (
                    <span>Iniciar sesión</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
