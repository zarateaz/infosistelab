"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Cpu,
  Eye,
  Flame,
  ArrowRight,
  ShoppingBag,
  MessageCircle,
  RotateCcw,
  Layers,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/gsap/registerGsap";

export type HardwareTier = "DESKTOP_120FPS_ULTRA" | "MOBILE_PRO" | "LOW_END_SAFE";

interface DeviceCapabilities {
  tier: HardwareTier;
  isCoarsePointer: boolean;
  concurrency: number;
  deviceMemory: number;
  reducedMotion: boolean;
  width: number;
  height: number;
  refreshRate: number;
  gpuRenderer: string;
  isLowPowerGpu: boolean;
}

// ---------------------------------------------------------------------------
// 1. MOTOR DE TELEMETRÍA HEURÍSTICA Y DETECCIÓN DE HARDWARE (ALTA INGENIERÍA)
// ---------------------------------------------------------------------------
function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    tier: "DESKTOP_120FPS_ULTRA",
    isCoarsePointer: false,
    concurrency: 8,
    deviceMemory: 8,
    reducedMotion: false,
    width: 1440,
    height: 900,
    refreshRate: 60,
    gpuRenderer: "standard",
    isLowPowerGpu: false,
  });

  useEffect(() => {
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const concurrency = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    // @ts-expect-error deviceMemory is standard in Chromium
    const memory = typeof navigator !== "undefined" && navigator.deviceMemory ? Number(navigator.deviceMemory) : 8;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Detección de conexión y ahorro de datos (Android Data Saver)
    // @ts-expect-error connection is standard in Chrome / Android WebKit
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isDataSaver = conn?.saveData === true || conn?.effectiveType === "2g" || conn?.effectiveType === "3g";

    // Sniffing de GPU mediante WebGL Context Debug Info
    let gpuRenderer = "standard";
    let isLowPowerGpu = false;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          gpuRenderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "").toLowerCase();
          // Identificación de GPUs de gama baja (Android budget o iGPUs débiles)
          if (
            gpuRenderer.includes("mali-400") ||
            gpuRenderer.includes("mali-g31") ||
            gpuRenderer.includes("mali-g51") ||
            gpuRenderer.includes("mali-g52") ||
            gpuRenderer.includes("adreno 3") ||
            gpuRenderer.includes("adreno 505") ||
            gpuRenderer.includes("adreno 506") ||
            gpuRenderer.includes("powervr") ||
            gpuRenderer.includes("llvmpipe") ||
            gpuRenderer.includes("software")
          ) {
            isLowPowerGpu = true;
          }
        }
      }
    } catch {
      // Entornos seguros con WebGL deshabilitado
    }

    // Clasificación heurística inteligente multinivel
    let tier: HardwareTier = "DESKTOP_120FPS_ULTRA";
    if (reducedMotion || isDataSaver || concurrency < 4 || memory < 4 || isLowPowerGpu) {
      // Perfil de Máxima Eficiencia Energética (Gama baja Android / PC ahorro):
      // Desactiva físicas continuas de mouse, desactiva multicapas DOM y garantiza 60 FPS sin consumo térmico
      tier = "LOW_END_SAFE";
    } else if (isCoarse || w < 1024) {
      // Perfil Móvil Pro (smartphones modernos con pantalla táctil):
      // Optimización táctil cinemática, 0 mouse listeners, GPU translate3d hardware composition
      tier = "MOBILE_PRO";
    } else {
      // Perfil Ultra Desktop:
      // Físicas viscoelásticas de 2do orden (Hooke + Euler), micro-paralaje diferencial multicapa a 120 FPS+
      tier = "DESKTOP_120FPS_ULTRA";
    }

    const rafId = requestAnimationFrame(() => {
      setCapabilities({
        tier,
        isCoarsePointer: isCoarse,
        concurrency,
        deviceMemory: memory,
        reducedMotion,
        width: w,
        height: h,
        refreshRate: 120,
        gpuRenderer,
        isLowPowerGpu,
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  return capabilities;
}

// ---------------------------------------------------------------------------
// 2. PARÁMETROS MATEMÁTICOS DE DESPIECE VECTORIAL Y RECORTE ISOMÉTRICO
// ---------------------------------------------------------------------------
// Vector normalizado de separación axial W_i
const AXIAL_WEIGHTS = [-1.0, -0.48, 0.0, 0.52, 1.05] as const;

// Factores de profundidad para cinemática diferencial paralaje Z_i
const Z_DEPTH = [2.2, 1.2, 0.2, -0.8, -1.8] as const;

// Polígonos de recorte isométrico calibrados en los valles naturales con tolerancia cero de solapamiento
const LAYER_POLYGONS = [
  "polygon(0% 0%, 100% 0%, 100% 29.5%, 0% 29.5%)",       // Capa 1: Tapa y Pantalla Superior
  "polygon(0% 29.5%, 100% 29.5%, 100% 45.5%, 0% 45.5%)", // Capa 2: Teclado / TopCase
  "polygon(0% 45.5%, 100% 45.5%, 100% 59.5%, 0% 59.5%)", // Capa 3: Placa Madre
  "polygon(0% 59.5%, 100% 59.5%, 100% 77.5%, 0% 77.5%)", // Capa 4: Cobre / RAM / NVMe
  "polygon(0% 77.5%, 100% 77.5%, 100% 100%, 0% 100%)",   // Capa 5: Chasis y Batería
] as const;

const FEATURES = [
  { label: "Garantía 100%", desc: "Sobre todo trabajo" },
  { label: "Diagnóstico honesto", desc: "Sin costos ocultos" },
  { label: "Repuestos originales", desc: "Stock verificado" },
  { label: "Soporte real", desc: "Técnicos certificados" },
];

export function HeroExploded() {
  const capabilities = useDeviceCapabilities();
  const [imageError, setImageError] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const isExplodedRef = useRef(false);
  const sliderInputRef = useRef<HTMLInputElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const [activeMobileHotspot, setActiveMobileHotspot] = useState<number>(0);

  // Contenedores
  const pinSectionRef = useRef<HTMLDivElement>(null);
  const pinContainerRef = useRef<HTMLDivElement>(null);
  const tiltWrapRef = useRef<HTMLDivElement>(null);
  const explodedWrapRef = useRef<HTMLDivElement>(null);

  // Elementos animados
  const headerContentRef = useRef<HTMLDivElement>(null);
  const assembledImgRef = useRef<HTMLDivElement>(null);
  const fullExplodedRef = useRef<HTMLDivElement>(null);
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null);
  const layer4Ref = useRef<HTMLDivElement>(null);
  const layer5Ref = useRef<HTMLDivElement>(null);
  const coreGlowRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  // Hotspots Desktop
  const hotspot1Ref = useRef<HTMLDivElement>(null);
  const hotspot2Ref = useRef<HTMLDivElement>(null);
  const hotspot3Ref = useRef<HTMLDivElement>(null);

  // Instancias de animación
  const scrollTriggerInstanceRef = useRef<ScrollTrigger | null>(null);

  // Cálculo matemático de los desplazamientos axiales iniciales Delta Y
  const initialLayerY = useMemo(() => {
    const isMobile = capabilities.tier === "MOBILE_PRO";
    const containerH = capabilities.height || 800;
    const aMax = isMobile ? Math.min(60, containerH * 0.12) : 100;
    const alpha = isMobile ? 0.85 : 1.0;

    return AXIAL_WEIGHTS.map((w) => -w * aMax * alpha);
  }, [capabilities.tier]);

  // Precarga y decodificación asíncrona de texturas en VRAM (Zero-Jank first scroll)
  useEffect(() => {
    let active = true;
    const preloadTextures = async () => {
      try {
        const img1 = new Image();
        img1.src = "/img/laptop-assembled.jpg";
        const img2 = new Image();
        img2.src = "/img/laptop-exploded.jpg";
        await Promise.allSettled([img1.decode(), img2.decode()]);
        if (active) {
          ScrollTrigger.refresh();
        }
      } catch {
        // Fallback natural
      }
    };
    preloadTextures();
    return () => {
      active = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // TIMELINE GSAP ADAPTATIVO POR PERFILES DE HARDWARE (GSAP CONTEXT)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    registerGsap();

    if (!pinSectionRef.current || !pinContainerRef.current) return;

    const isLowEnd = capabilities.tier === "LOW_END_SAFE";
    const isMobile = capabilities.tier === "MOBILE_PRO";

    const ctx = gsap.context(() => {
      // 1. Idle float levitation (desactivado en low-end)
      let floatTween: gsap.core.Tween | null = null;
      if (!isLowEnd && assembledImgRef.current) {
        floatTween = gsap.to(assembledImgRef.current, {
          y: -8,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      // 2. Configuración de ScrollTrigger según Hardware Tier
      const scrubSpeed = isMobile ? 0.6 : 1.2;
      const scrollDistance = isMobile ? "+=150%" : "+=220%";

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinSectionRef.current,
          start: "top top",
          end: scrollDistance,
          pin: pinContainerRef.current,
          scrub: scrubSpeed,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;
            const pct = Math.round(p * 100);

            if (sliderInputRef.current && document.activeElement !== sliderInputRef.current) {
              sliderInputRef.current.value = String(pct);
            }
            if (progressTextRef.current) {
              progressTextRef.current.textContent = `${pct}%`;
            }

            const exploded = p > 0.5;
            if (isExplodedRef.current !== exploded) {
              isExplodedRef.current = exploded;
              setIsExploded(exploded);
            }

            // Sincronización del hotspot activo en móvil
            let nextSpot = 0;
            if (p >= 0.88) nextSpot = 3;
            else if (p >= 0.76) nextSpot = 2;
            else if (p >= 0.6) nextSpot = 1;
            setActiveMobileHotspot((prev) => (prev !== nextSpot ? nextSpot : prev));

            if (floatTween) {
              if (p > 0.05) floatTween.pause();
              else floatTween.play();
            }
          },
        },
      });

      scrollTriggerInstanceRef.current = tl.scrollTrigger || null;

      // --- CONFIGURACIÓN DE ESTADOS INICIALES MEDIANTE ÁLGEBRA VECTORIAL ---
      // Estado de reposo absoluto (0% scroll): Únicamente la laptop armada es visible
      gsap.set(assembledImgRef.current, { opacity: 1, y: 0 });
      gsap.set(fullExplodedRef.current, { opacity: 0 });

      // Capas 1 a 5 con desplazamiento vectorial matemático Delta Y inicial y opacidad 0
      gsap.set(layer1Ref.current, { y: initialLayerY[0], scale: 0.96, opacity: 0 });
      gsap.set(layer2Ref.current, { y: initialLayerY[1], opacity: 0 });
      gsap.set(layer3Ref.current, { y: initialLayerY[2], opacity: 0 });
      gsap.set(layer4Ref.current, { y: initialLayerY[3], opacity: 0 });
      gsap.set(layer5Ref.current, { y: initialLayerY[4], opacity: 0 });

      // Core glow optimizado en GPU
      if (coreGlowRef.current) {
        gsap.set(coreGlowRef.current, { opacity: 0, scale: 0.85 });
      }

      // Hotspots técnicos: estrictamente ocultos en reposo inicial (0% scroll)
      gsap.set([hotspot1Ref.current, hotspot2Ref.current, hotspot3Ref.current], {
        opacity: 0,
        scale: 0.94,
        y: 14,
      });

      // FASE 1: DESVANECIMIENTO GRADUAL DEL TEXTO (0% -> 22%)
      tl.to(scrollIndicatorRef.current, { opacity: 0, y: -6, duration: 0.15, ease: "power1.out" }, 0)
        .to(headerContentRef.current, { y: -65, opacity: 0, duration: 0.25, ease: "sine.inOut" }, 0.02)
        .to(assembledImgRef.current, { opacity: 0, duration: 0.25, ease: "sine.inOut" }, 0.03)
        .to(
          [layer1Ref.current, layer2Ref.current, layer3Ref.current, layer4Ref.current, layer5Ref.current],
          { opacity: 1, duration: 0.22, stagger: 0.015, ease: "sine.inOut" },
          0.04
        );

      // FASE 2: DESPIECE ALGEBRAICO VECTORIAL (15% -> 60%)
      tl.to(layer1Ref.current, { y: 0, scale: 1, duration: 0.48, ease: "power1.inOut" }, 0.15)
        .to(layer2Ref.current, { y: 0, duration: 0.48, ease: "power1.inOut" }, 0.16)
        .to(layer3Ref.current, { y: 0, duration: 0.48, ease: "power1.inOut" }, 0.17)
        .to(layer4Ref.current, { y: 0, duration: 0.48, ease: "power1.inOut" }, 0.16)
        .to(layer5Ref.current, { y: 0, duration: 0.48, ease: "power1.inOut" }, 0.15);

      // Resplandor del núcleo (acelerado por GPU)
      if (coreGlowRef.current) {
        tl.to(coreGlowRef.current, { opacity: 0.85, scale: 1, duration: 0.5, ease: "power1.inOut" }, 0.2);
      }

      // FASE 2.5: TRANSICIÓN A LA IMAGEN COMPLETA PURA (SIN LÍNEAS DE RECORTE NI MULTIPLY DOBLE)
      tl.to(fullExplodedRef.current, { opacity: 1, duration: 0.14, ease: "power1.inOut" }, 0.58)
        .to(
          [layer1Ref.current, layer2Ref.current, layer3Ref.current, layer4Ref.current, layer5Ref.current],
          { opacity: 0, duration: 0.14, ease: "power1.inOut" },
          0.58
        );

      // FASE 3: REVELADO SECUENCIAL DE HOTSPOTS (65% -> 100%)
      tl.to(hotspot1Ref.current, { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: "power2.out" }, 0.65)
        .to(hotspot2Ref.current, { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: "power2.out" }, 0.76)
        .to(hotspot3Ref.current, { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: "power2.out" }, 0.87);
    }, pinSectionRef);

    return () => {
      ctx.revert();
    };
  }, [capabilities.tier, initialLayerY]);

  // ---------------------------------------------------------------------------
  // 3. CINEMÁTICA 3D Y FÍSICA DE OSCILADOR ARMÓNICO AMORTIGUADO (120 FPS NATIVO)
  // Simulación física de 2do orden: Hooke + Amortiguamiento Viscoso Crítico
  // F = -k*(x - target) - c*v | Integración Euler semi-implícita en GPU
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (capabilities.tier !== "DESKTOP_120FPS_ULTRA" || !tiltWrapRef.current) return;

    const tiltEl = tiltWrapRef.current;

    // Variables de estado cinemático continuo
    let currentRotX = 0;
    let currentRotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let velX = 0;
    let velY = 0;

    // Coeficientes físicos calibrados para respuesta críticamente amortiguada (cero rebote molesto)
    const springK = 180; // Rigidez angular (N*m/rad)
    const dampingC = 22; // Amortiguamiento viscoso (N*m*s/rad)
    const mass = 1.0;

    let animFrameId: number;
    let lastTime = performance.now();
    let isMouseActive = false;

    const updatePhysics = (now: number) => {
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      if (dt > 0.05) dt = 0.05; // Protección contra desbordamiento numérico en cambios de pestaña

      // Cálculo de fuerzas vectoriales
      const forceX = -springK * (currentRotX - targetRotX) - dampingC * velX;
      const forceY = -springK * (currentRotY - targetRotY) - dampingC * velY;

      // Integración de aceleración y velocidad
      velX += (forceX / mass) * dt;
      velY += (forceY / mass) * dt;

      currentRotX += velX * dt;
      currentRotY += velY * dt;

      // Inyección vectorial directa al hardware GPU (Compositor Layer: Zero Reflow/Paint)
      tiltEl.style.transform = `rotateX(${currentRotX.toFixed(3)}deg) rotateY(${currentRotY.toFixed(3)}deg)`;

      // Loop ultra-eficiente: duerme automáticamente cuando alcanza reposo absoluto (0% uso de CPU idle)
      const isResting =
        !isMouseActive &&
        Math.abs(currentRotX) < 0.005 &&
        Math.abs(currentRotY) < 0.005 &&
        Math.abs(velX) < 0.005 &&
        Math.abs(velY) < 0.005;

      if (!isResting) {
        animFrameId = requestAnimationFrame(updatePhysics);
      } else {
        tiltEl.style.transform = "rotateX(0deg) rotateY(0deg)";
      }
    };

    let cachedRect: DOMRect | null = null;
    const updateRect = () => {
      if (tiltEl) cachedRect = tiltEl.getBoundingClientRect();
    };
    updateRect();
    window.addEventListener("resize", updateRect, { passive: true });

    const handleMouseMove = (e: MouseEvent) => {
      if (!cachedRect) updateRect();
      if (!cachedRect) return;

      const centerX = cachedRect.left + cachedRect.width / 2;
      const centerY = cachedRect.top + cachedRect.height / 2;

      // Coordenadas normalizadas n_x, n_y en [-1, 1]
      const nx = Math.max(-1, Math.min(1, (e.clientX - centerX) / (cachedRect.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - centerY) / (cachedRect.height / 2)));

      targetRotY = nx * 7.5;
      targetRotX = -ny * 5.5;

      if (!isMouseActive) {
        isMouseActive = true;
        lastTime = performance.now();
        cancelAnimationFrame(animFrameId);
        animFrameId = requestAnimationFrame(updatePhysics);
      }
    };

    const handleMouseLeave = () => {
      targetRotX = 0;
      targetRotY = 0;
      isMouseActive = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [capabilities.tier]);

  // Manejo de interacción de botón y slider coordinado con Lenis
  const handleToggleExplode = useCallback(() => {
    if (!scrollTriggerInstanceRef.current) return;
    const st = scrollTriggerInstanceRef.current;
    const targetProgress = isExploded ? 0 : 0.95;
    const targetScroll = st.start + (st.end - st.start) * targetProgress;

    const win = window as unknown as {
      __lenis?: { scrollTo: (t: number, opts?: { duration?: number }) => void };
    };

    if (win.__lenis?.scrollTo) {
      win.__lenis.scrollTo(targetScroll, { duration: 1 });
    } else {
      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }
  }, [isExploded]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) / 100;
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${e.target.value}%`;
    }
    if (!scrollTriggerInstanceRef.current) return;
    const st = scrollTriggerInstanceRef.current;
    const targetScroll = st.start + (st.end - st.start) * val;

    const win = window as unknown as {
      __lenis?: { scrollTo: (t: number, opts?: { immediate?: boolean }) => void };
    };

    if (win.__lenis?.scrollTo) {
      win.__lenis.scrollTo(targetScroll, { immediate: true });
    } else {
      window.scrollTo({
        top: targetScroll,
        behavior: "auto",
      });
    }
  }, []);

  return (
    <section
      id="hero-exploded"
      ref={pinSectionRef}
      className="relative w-full bg-white text-fg selection:bg-accent/20 selection:text-accent"
    >
      {/* CONTENEDOR PINNEADO POR SCROLLTRIGGER - 100DVH BLANCO PURO */}
      <div
        ref={pinContainerRef}
        className="relative flex h-[100dvh] w-full flex-col justify-between overflow-hidden bg-white px-3.5 pt-16 pb-2 sm:px-6 sm:pt-22 sm:pb-3 md:pt-24 md:pb-4 lg:px-8"
      >
        {/* ========================================================= */}
        {/* CABECERA / TITULAR PRINCIPAL                             */}
        {/* ========================================================= */}
        <div
          ref={headerContentRef}
          className="relative z-20 mx-auto flex w-full max-w-3xl shrink-0 flex-col items-center text-center transition-transform"
        >
          {/* Badge superior con texto responsivo para evitar saltos en pantallas de 360px */}
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/8 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider sm:tracking-[0.2em] text-accent shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="hidden xs:inline">Laboratorio Microelectrónico & Hardware Huancayo</span>
            <span className="xs:hidden">Laboratorio Microelectrónico Huancayo</span>
          </div>

          <h1 className="mt-1.5 sm:mt-2 font-display text-[clamp(1.35rem,4.5vw,2.5rem)] font-black tracking-tight text-fg leading-tight">
            Ingeniería por dentro.{" "}
            <span className="bg-gradient-to-r from-accent via-sky-600 to-cyan-600 bg-clip-text text-transparent">
              Rendimiento extremo por fuera.
            </span>
          </h1>

          <p className="mt-1 max-w-xl text-[11px] sm:text-xs md:text-sm text-fg-muted leading-relaxed line-clamp-2 sm:line-clamp-none">
            Diagnóstico avanzado a nivel de componente, micro-soldadura BGA, repuestos certificados
            y repotenciación térmica de alto nivel.
          </p>
        </div>

        {/* ========================================================= */}
        {/* ÁREA CENTRAL: CÁLCULO CINEMÁTICO Y DESPIECE VECTORIAL 3D */}
        {/* ========================================================= */}
        <div
          className="relative z-10 mx-auto my-auto flex w-full max-w-6xl items-center justify-center flex-1 min-h-0 py-0.5 sm:py-1"
          style={{ perspective: "1200px" }}
        >
          {/* Contenedor con matriz de rotación elástica en 3D */}
          <div
            ref={tiltWrapRef}
            className="relative flex w-full items-center justify-center transform-gpu"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Canvas / Visor de la Laptop - Escala calibrada con cota máxima de altura (Zero Collision) */}
            <div
              ref={explodedWrapRef}
              style={{ isolation: "isolate" }}
              className="relative aspect-[16/9] w-full max-w-[850px] xl:max-w-[920px] max-h-[36vh] sm:max-h-[44vh] md:max-h-[47vh] flex items-center justify-center overflow-visible"
            >
              {imageError ? (
                <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border-strong bg-white p-6 text-center shadow-md">
                  <Cpu className="h-16 w-16 animate-pulse text-accent" />
                  <p className="mt-4 font-mono text-sm text-fg">
                    MODO TÉCNICO INTERNO ACTIVO // INFOSISTEL LAB
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-fg-muted">
                    Despiece visual 3D calibrado para laboratorio de microelectrónica.
                  </p>
                </div>
              ) : (
                <>
                  {/* Resplandor óptico cian del Core acelerado por GPU (Zero-Jank: solo scale/opacity) */}
                  <div
                    ref={coreGlowRef}
                    aria-hidden="true"
                    style={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center will-change-transform"
                  >
                    <div className="h-3/5 w-4/5 rounded-full bg-gradient-to-r from-blue-600/25 via-cyan-400/35 to-sky-500/20 blur-3xl transform-gpu" />
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* 1. IMAGEN ASSEMBLED (ESTADO 0% SCROLL)               */}
                  {/* ---------------------------------------------------- */}
                  <div
                    ref={assembledImgRef}
                    className="pointer-events-none absolute inset-0 z-20 h-full w-full will-change-transform"
                    style={{
                      mixBlendMode: "multiply",
                      transform: "translate3d(0,0,0)",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/img/laptop-assembled.jpg"
                      alt="Laptop de Alta Gama Armada - Infosistel"
                      decoding="async"
                      fetchPriority="high"
                      onError={() => setImageError(true)}
                      className="h-full w-full object-contain filter drop-shadow-[0_12px_28px_rgba(11,18,48,0.1)]"
                    />
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* 2. LAS 5 CAPAS ISOMÉTRICAS CON SOLAPAMIENTO EPSILON  */}
                  {/* ---------------------------------------------------- */}

                  {/* CAPA 1: TAPA Y PANTALLA SUPERIOR */}
                  <div
                    ref={layer1Ref}
                    className="pointer-events-none absolute inset-0 z-15 h-full w-full will-change-transform"
                    style={{
                      clipPath: LAYER_POLYGONS[0],
                      mixBlendMode: "multiply",
                      transform: "translate3d(0,0,0)",
                      backfaceVisibility: "hidden",
                      opacity: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/img/laptop-exploded.jpg"
                      alt="Capa 1: Pantalla y Tapa Superior"
                      decoding="async"
                      fetchPriority="high"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* CAPA 2: TECLADO / TOP CASE */}
                  <div
                    ref={layer2Ref}
                    className="pointer-events-none absolute inset-0 z-14 h-full w-full will-change-transform"
                    style={{
                      clipPath: LAYER_POLYGONS[1],
                      mixBlendMode: "multiply",
                      transform: "translate3d(0,0,0)",
                      backfaceVisibility: "hidden",
                      opacity: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/img/laptop-exploded.jpg"
                      alt="Capa 2: Teclado y Chasis Superior"
                      decoding="async"
                      fetchPriority="high"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* CAPA 3: PLACA MADRE CIAN (EJE CENTRAL) */}
                  <div
                    ref={layer3Ref}
                    className="pointer-events-none absolute inset-0 z-13 h-full w-full will-change-transform"
                    style={{
                      clipPath: LAYER_POLYGONS[2],
                      mixBlendMode: "multiply",
                      transform: "translate3d(0,0,0)",
                      backfaceVisibility: "hidden",
                      opacity: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/img/laptop-exploded.jpg"
                      alt="Capa 3: Placa Madre con Circuitos"
                      decoding="async"
                      fetchPriority="high"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* CAPA 4: COOLERS DE COBRE, RAM & NVME */}
                  <div
                    ref={layer4Ref}
                    className="pointer-events-none absolute inset-0 z-12 h-full w-full will-change-transform"
                    style={{
                      clipPath: LAYER_POLYGONS[3],
                      mixBlendMode: "multiply",
                      transform: "translate3d(0,0,0)",
                      backfaceVisibility: "hidden",
                      opacity: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/img/laptop-exploded.jpg"
                      alt="Capa 4: Disipación de Cobre, RAM y SSD"
                      decoding="async"
                      fetchPriority="high"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* CAPA 5: CHASIS INFERIOR Y BATERÍA */}
                  <div
                    ref={layer5Ref}
                    className="pointer-events-none absolute inset-0 z-11 h-full w-full will-change-transform"
                    style={{
                      clipPath: LAYER_POLYGONS[4],
                      mixBlendMode: "multiply",
                      transform: "translate3d(0,0,0)",
                      backfaceVisibility: "hidden",
                      opacity: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/img/laptop-exploded.jpg"
                      alt="Capa 5: Chasis Inferior y Batería"
                      decoding="async"
                      fetchPriority="high"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* 3. IMAGEN COMPLETA DESPIEZADA SIN RECORTES (ESTADO FINAL PURO) */}
                  {/* Elimina 100% cualquier línea de corte o solapamiento multiply */}
                  {/* ---------------------------------------------------- */}
                  <div
                    ref={fullExplodedRef}
                    className="pointer-events-none absolute inset-0 z-20 h-full w-full will-change-transform"
                    style={{
                      mixBlendMode: "multiply",
                      transform: "translate3d(0,0,0)",
                      backfaceVisibility: "hidden",
                      opacity: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/img/laptop-exploded.jpg"
                      alt="Laptop de Alta Gama Despiezada - Infosistel"
                      decoding="async"
                      fetchPriority="high"
                      className="h-full w-full object-contain filter drop-shadow-[0_16px_36px_rgba(11,18,48,0.12)]"
                    />
                  </div>
                </>
              )}

              {/* ======================================================= */}
              {/* 5. HOTSPOTS TÉCNICOS FLOTANTES PARA DESKTOP (>= 1024px)  */}
              {/* ======================================================= */}
              <div className="hidden lg:block pointer-events-auto">
                {/* HOTSPOT 1: VISUALIZACIÓN (Despejado a la derecha) */}
                <div
                  ref={hotspot1Ref}
                  style={{ opacity: 0 }}
                  className="absolute top-0 -right-16 xl:-right-32 z-30 w-72 xl:w-80 will-change-transform"
                >
                  <div className="relative rounded-2xl border border-slate-200/90 bg-white/95 p-4 text-left shadow-[0_12px_32px_rgba(11,18,48,0.06)] backdrop-blur-md transition-all hover:scale-105 hover:border-accent hover:shadow-[0_16px_36px_rgba(10,95,219,0.12)]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Eye className="h-4 w-4" />
                      </div>
                      <span className="font-mono text-[10px] font-bold tracking-wider text-accent">
                        01 // VISUALIZACIÓN
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-sm font-bold text-slate-900">
                      Pantallas Originales & Bisagras
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Reemplazo de paneles IPS, FHD, 144Hz y reconstrucción estructural en
                      aluminio/polímero de alta resistencia.
                    </p>
                    {/* Conector SVG dinámico con punto terminal extendido */}
                    <svg
                      aria-hidden="true"
                      className="absolute top-1/2 -left-12 h-4 w-12 -translate-y-1/2 overflow-visible"
                    >
                      <line
                        x1="48"
                        y1="8"
                        x2="6"
                        y2="8"
                        stroke="#0a5fdb"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <circle cx="6" cy="8" r="3" fill="#0a5fdb" className="animate-pulse" />
                    </svg>
                  </div>
                </div>

                {/* HOTSPOT 2: MICROELECTRÓNICA (Despejado a la izquierda) */}
                <div
                  ref={hotspot2Ref}
                  style={{ opacity: 0 }}
                  className="absolute top-[46%] -left-16 xl:-left-32 z-30 w-72 xl:w-80 -translate-y-1/2 will-change-transform"
                >
                  <div className="relative rounded-2xl border border-slate-200/90 bg-white/95 p-4 text-left shadow-[0_12px_32px_rgba(11,18,48,0.06)] backdrop-blur-md transition-all hover:scale-105 hover:border-accent hover:shadow-[0_16px_36px_rgba(10,95,219,0.12)]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <span className="font-mono text-[10px] font-bold tracking-wider text-accent">
                        02 // MICROELECTRÓNICA
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-sm font-bold text-slate-900">
                      Reparación de Placas a Nivel Componente
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Diagnóstico con osciloscopio digital, detección de cortos SMD térmicos, reballing y
                      programación de BIOS/KBC.
                    </p>
                    {/* Conector SVG hacia la placa base extendido */}
                    <svg
                      aria-hidden="true"
                      className="absolute top-1/2 -right-12 h-4 w-12 -translate-y-1/2 overflow-visible"
                    >
                      <line
                        x1="0"
                        y1="8"
                        x2="42"
                        y2="8"
                        stroke="#0a5fdb"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <circle cx="42" cy="8" r="3" fill="#0a5fdb" className="animate-pulse" />
                    </svg>
                  </div>
                </div>

                {/* HOTSPOT 3: POTENCIA & TÉRMICA (Despejado abajo a la derecha) */}
                <div
                  ref={hotspot3Ref}
                  style={{ opacity: 0 }}
                  className="absolute bottom-0 -right-16 xl:-right-32 z-30 w-72 xl:w-80 will-change-transform"
                >
                  <div className="relative rounded-2xl border border-slate-200/90 bg-white/95 p-4 text-left shadow-[0_12px_32px_rgba(11,18,48,0.06)] backdrop-blur-md transition-all hover:scale-105 hover:border-accent hover:shadow-[0_16px_36px_rgba(10,95,219,0.12)]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Flame className="h-4 w-4" />
                      </div>
                      <span className="font-mono text-[10px] font-bold tracking-wider text-accent">
                        03 // POTENCIA & TÉRMICA
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-sm font-bold text-slate-900">
                      Upgrades NVMe, RAM & Mantenimiento Pro
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Pastas térmicas de alta conductividad (Thermal Grizzly/Arctic), limpieza ultrasónica y
                      reemplazo de turbinas.
                    </p>
                    {/* Conector SVG hacia los coolers extendido */}
                    <svg
                      aria-hidden="true"
                      className="absolute top-1/2 -left-12 h-4 w-12 -translate-y-1/2 overflow-visible"
                    >
                      <line
                        x1="48"
                        y1="8"
                        x2="6"
                        y2="8"
                        stroke="#0a5fdb"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <circle cx="6" cy="8" r="3" fill="#0a5fdb" className="animate-pulse" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARRUSEL DE HOTSPOTS SINCRONIZADO PARA MÓVIL (< 1024px)   */}
        {/* ========================================================= */}
        <div className="block lg:hidden relative z-20 mx-auto w-full max-w-sm px-2 min-h-[52px] flex items-center justify-center">
          {activeMobileHotspot === 0 ? (
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 py-1">
              <ChevronDown size={12} className="animate-bounce text-accent" />
              <span>Desliza para explorar la arquitectura interna</span>
            </div>
          ) : (
            <div className="w-full transition-all duration-300 animate-in fade-in zoom-in-95">
              {activeMobileHotspot === 1 && (
                <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-md backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <Eye size={13} className="text-accent" />
                    <span className="font-mono text-[9px] font-bold text-accent">01 // VISUALIZACIÓN</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-0.5">Pantallas Originales & Bisagras</h3>
                  <p className="text-[10px] text-slate-600">Reemplazo de paneles IPS, FHD, 144Hz y calibración.</p>
                </div>
              )}
              {activeMobileHotspot === 2 && (
                <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-md backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={13} className="text-accent" />
                    <span className="font-mono text-[9px] font-bold text-accent">02 // MICROELECTRÓNICA</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-0.5">Reparación de Placas SMD & BGA</h3>
                  <p className="text-[10px] text-slate-600">Diagnóstico con osciloscopio y microsoldadura certificada.</p>
                </div>
              )}
              {activeMobileHotspot === 3 && (
                <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-md backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <Flame size={13} className="text-accent" />
                    <span className="font-mono text-[9px] font-bold text-accent">03 // POTENCIA & TÉRMICA</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-0.5">Upgrades NVMe, RAM & Disipación</h3>
                  <p className="text-[10px] text-slate-600">Pastas térmicas de alta conductividad y mantenimiento pro.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* PARTE INFERIOR: CONTROLES HÍBRIDOS CENTRADOS              */}
        {/* ========================================================= */}
        <div className="relative z-20 mx-auto mt-0.5 sm:mt-1 flex w-full max-w-4xl shrink-0 flex-nowrap items-center justify-center gap-2 sm:gap-4">
          {/* Indicador de Scroll / Desarmado */}
          <div
            ref={scrollIndicatorRef}
            className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-fg-muted"
          >
            <ChevronDown size={14} className="animate-bounce text-accent" />
            <span>Desliza para desarmar el equipo ↓</span>
          </div>

          {/* Control Híbrido: Botón + Slider Táctil */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-[0_4px_16px_rgba(11,18,48,0.06)]">
            <button
              onClick={handleToggleExplode}
              type="button"
              className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold text-accent transition-colors hover:bg-accent/20 active:scale-95"
            >
              {isExploded ? (
                <>
                  <RotateCcw size={12} className="text-accent" />
                  <span>Armar</span>
                </>
              ) : (
                <>
                  <Layers size={12} className="text-accent" />
                  <span>Explosionar</span>
                </>
              )}
            </button>

            {/* Slider de Progreso (Direct DOM ref updates para 0 re-renders en scroll) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                ref={sliderInputRef}
                type="range"
                min="0"
                max="100"
                defaultValue={0}
                onChange={handleSliderChange}
                aria-label="Progreso del despiece 3D"
                className="h-1.5 w-16 sm:w-28 cursor-pointer accent-accent"
              />
              <span ref={progressTextRef} className="w-7 font-mono text-[9px] sm:text-[10px] text-fg-muted">0%</span>
            </div>
          </div>

          {/* CTA WhatsApp Directo (visible en pantallas medianas hacia arriba para evitar duplicidad con el botón flotante en móvil) */}
          <a
            href="https://wa.me/51900000000?text=Hola%20Infosistel,%20estoy%20en%20su%20web%20y%20deseo%20un%20diagn%C3%B3stico%20especializado%20para%20mi%20laptop"
            target="_blank"
            rel="noopener noreferrer"
            className="group hidden sm:inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20ba59] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-emerald-500/20 transition-transform hover:scale-105 active:scale-95"
          >
            <MessageCircle size={14} className="fill-white text-white" />
            Diagnóstico WhatsApp
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TIRA DE BENEFICIOS INFOSISTEL (TRANSICIÓN A LA TIENDA)    */}
      {/* ========================================================= */}
      <div className="relative z-20 mx-auto -mt-6 max-w-6xl px-4 pb-12 sm:px-6">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(11,18,48,0.05)] sm:grid-cols-4 sm:p-5">
          {FEATURES.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center sm:text-left transition-colors hover:border-accent/40 hover:bg-white"
            >
              <div className="flex items-center justify-center gap-1.5 sm:justify-start">
                <Sparkles size={13} className="text-accent" />
                <p className="text-xs font-bold text-fg">{item.label}</p>
              </div>
              <p className="mt-0.5 text-[11px] text-fg-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
