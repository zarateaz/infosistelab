"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  Hand,
  ChevronRight,
  Mouse,
  Keyboard,
  Laptop,
  Monitor,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface CinematicIntroProps {
  onEnter: (category?: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  greetingText: string;
  greetingIcon: string;
  autoEnterSeconds?: number;
}

/**
 * Entrada Profesional de Tienda en Blanco Puro con Rueda Épica de Cuenta Regresiva
 * Totalmente infalible ante re-renders: calcula el tiempo transcurrido en tiempo real (Date.now())
 * e incluye una rueda animada SVG a 60 FPS con contador decreciente y anillo de progreso.
 */
export function CinematicIntro({
  onEnter,
  soundEnabled,
  onToggleSound,
  greetingText,
  greetingIcon,
  autoEnterSeconds = 8,
}: CinematicIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [countdown, setCountdown] = useState(autoEnterSeconds);
  const [progressRatio, setProgressRatio] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeShowreelIndex, setActiveShowreelIndex] = useState(0);

  // Referencias estables para callbacks
  const onEnterRef = useRef(onEnter);
  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  const hasLaunchedRef = useRef(false);

  // Manejador de entrada suave (solo se dispara una vez)
  const handleLaunch = useCallback((targetCategory?: string) => {
    if (hasLaunchedRef.current) return;
    hasLaunchedRef.current = true;
    setIsTransitioning(true);
    setTimeout(() => {
      onEnterRef.current(targetCategory);
    }, 280);
  }, []);

  // Showreel de productos destacados
  const showreelItems = [
    { title: "Mouse Logitech G502 HERO RGB", sub: "Sensor HERO 25K · 11 botones · S/ 169.00", icon: "🖱️" },
    { title: "Teclado Mecánico Redragon Kumara K552", sub: "Switches Outemu Red · Anti-Ghosting · S/ 149.00", icon: "⌨️" },
    { title: "Laptop Lenovo IdeaPad Slim 3 15.6\"", sub: "Ryzen 5 · 16GB RAM · 512GB SSD · S/ 1,999.00", icon: "💻" },
    { title: "Monitor Gamer 24\" 165Hz IPS 1ms", sub: "Panel Fast IPS · FreeSync Premium · S/ 589.00", icon: "🖥️" },
  ];

  // Rotar showreel cada 2.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveShowreelIndex((prev) => (prev + 1) % showreelItems.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [showreelItems.length]);

  // TEMPORIZADOR INFALIBLE: Basado en reloj real de milisegundos (Date.now())
  useEffect(() => {
    const totalDurationMs = autoEnterSeconds * 1000;
    const startTimestamp = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimestamp;
      const remainingMs = Math.max(0, totalDurationMs - elapsed);
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      const ratio = Math.max(0, Math.min(1, remainingMs / totalDurationMs));

      setCountdown(remainingSeconds);
      setProgressRatio(ratio);

      if (remainingMs <= 0) {
        clearInterval(interval);
        handleLaunch();
      }
    }, 40); // 40ms = 25 actualizaciones/segundo para una rueda ultra fluida

    return () => clearInterval(interval);
  }, [autoEnterSeconds, handleLaunch]);

  // Fondo animado sutil en Canvas (Luz fluida sobre blanco puro)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    interface LightPoint {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
    }

    const points: LightPoint[] = [];
    const count = 35;

    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.35 + 0.1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(2, 132, 199, 0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(2, 132, 199, ${p.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Perímetro de la rueda circular (Radio r = 26 => Circunferencia = 2 * PI * 26 ≈ 163.36)
  const ringCircumference = 163.36;
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  return (
    <div
      onClick={() => handleLaunch()}
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-white text-slate-900 select-none transition-all duration-300 cursor-pointer ${
        isTransitioning ? "opacity-0 scale-98" : "opacity-100 scale-100"
      }`}
    >
      {/* CANVAS SUTIL DE FONDO (BLANCO PURO) */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* RESPLANDOR SUAVE DE LUZ DE ESTUDIO */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full bg-blue-50/70 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] rounded-full bg-slate-100/80 blur-[100px]" />
      </div>

      {/* ======================================================== */}
      {/* BARRA SUPERIOR DE BIENVENIDA                            */}
      {/* ======================================================== */}
      <div className="relative z-20 flex items-center justify-between p-4 sm:p-6 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800">INFOSISTEL INTERACTIVO</span>
          <span className="text-slate-300">|</span>
          <span className="hidden sm:inline">HUANCAYO, PERÚ</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-slate-600 bg-slate-100/80 px-3 py-1 rounded-full text-[11px] font-semibold border border-slate-200/80">
            <ShieldCheck size={14} className="text-blue-600" />
            <span>Garantía Oficial & Soporte Técnico</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSound();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 shadow-xs active:scale-95 transition-all"
          >
            {soundEnabled ? (
              <>
                <Volume2 size={14} className="text-blue-600" />
                <span className="text-[11px] font-bold">Audio</span>
              </>
            ) : (
              <>
                <VolumeX size={14} className="text-slate-400" />
                <span className="text-[11px] font-bold">Silenciado</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CUERPO CENTRAL: LOGO LIMPIO Y RUEDA ÉPICA DE CUENTA REGRESIVA */}
      {/* ======================================================== */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 text-center my-auto max-w-3xl mx-auto w-full">
        {/* LOGO OFICIAL DE INFOSISTEL EN ALTA RESOLUCIÓN */}
        <div className="relative my-3 sm:my-5 group">
          <div className="relative p-4 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/60 transition-transform duration-300 group-hover:scale-102">
            <Image
              src="/brand/infosistel-logo-v3.png"
              alt="INFOSISTEL"
              width={540}
              height={100}
              priority
              className="relative h-14 xs:h-18 sm:h-22 md:h-26 w-auto object-contain"
            />
          </div>
        </div>

        {/* Saludo y Título Profesional */}
        <div className="space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1 text-xs sm:text-sm font-bold text-blue-800 shadow-xs">
            <span>{greetingIcon}</span>
            <span>{greetingText}</span>
            <span className="text-blue-500">· Catálogo en Tienda</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Tecnología, Repuestos y Equipos
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed font-medium">
            Explora precios en vivo, fichas técnicas y stock disponible en nuestra tienda.
          </p>
        </div>

        {/* VITRINA SHOWREEL */}
        <div className="w-full max-w-md my-3 sm:my-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">
                {showreelItems[activeShowreelIndex].icon}
              </span>
              <div className="text-left min-w-0 flex-1">
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  EN EXHIBICIÓN HOY
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {showreelItems[activeShowreelIndex].title}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {showreelItems[activeShowreelIndex].sub}
                </div>
              </div>
              <Sparkles size={16} className="text-amber-500 shrink-0" />
            </div>
          </div>
        </div>

        {/* ACCESOS DIRECTOS A CATEGORÍAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full max-w-xl mb-4">
          {[
            { name: "MOUSE", label: "Mouses", icon: Mouse },
            { name: "TECLADOS", label: "Teclados", icon: Keyboard },
            { name: "LAPTOPS", label: "Laptops & PCs", icon: Laptop },
            { name: "MONITORES", label: "Monitores", icon: Monitor },
          ].map((cat) => (
            <button
              key={cat.name}
              onClick={(e) => {
                e.stopPropagation();
                handleLaunch(cat.name);
              }}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-xs text-slate-800 transition-all active:scale-95 shadow-2xs font-bold text-xs"
            >
              <cat.icon size={15} className="text-blue-600" />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* BOTÓN MASTER: TOCAR PARA ENTRAR */}
        <div className="w-full max-w-md">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLaunch();
            }}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-4 text-sm sm:text-base font-black text-white shadow-lg shadow-blue-500/25 active:scale-95 transition-all group"
          >
            <Hand size={20} className="text-blue-200 animate-bounce" />
            <span>TOCAR PARA ENTRAR AL CATÁLOGO</span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* RUEDA ÉPICA DE CUENTA REGRESIVA CON SVG CIRCULAR Y NÚMERO */}
        {/* ======================================================== */}
        <div className="flex items-center justify-center gap-3.5 mt-4 p-2.5 px-4 rounded-2xl bg-slate-50/90 border border-slate-200 shadow-xs max-w-sm w-full">
          {/* Rueda Circular SVG con animación en tiempo real */}
          <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 64 64">
              {/* Pista gris de fondo */}
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-slate-200"
                strokeWidth="4.5"
                fill="none"
              />
              {/* Rueda azul activa animada */}
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-blue-600 transition-all duration-75 ease-linear"
                strokeWidth="4.5"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Contador numérico gigante en el centro de la rueda */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm sm:text-base font-black text-slate-900 font-mono leading-none">
                {countdown}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">
                seg
              </span>
            </div>
          </div>

          <div className="text-left flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Zap size={13} className="text-blue-600 animate-pulse shrink-0" />
              <span>Ingreso automático en marcha</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Toca la pantalla en cualquier momento
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BARRA INFERIOR DE PROGRESO SINCRONIZADA                  */}
      {/* ======================================================== */}
      <div className="relative z-20 flex flex-col items-center justify-center p-3 sm:p-4 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-2 font-medium text-[11px]">
          <span>Entrada automática en</span>
          <span className="font-bold text-blue-600 font-mono">{countdown}s</span>
          <span className="text-slate-300">·</span>
          <span>Toca cualquier parte para explorar</span>
        </div>

        <div className="h-1.5 w-48 sm:w-64 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-blue-600 transition-all duration-75 ease-linear rounded-full"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
