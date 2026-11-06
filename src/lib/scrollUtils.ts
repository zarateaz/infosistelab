"use client";

/**
 * Utilitario centralizado de navegación y scroll suave coordinado de alta precisión (120 FPS).
 * Integra sincronización dual entre Lenis v1 y GSAP ScrollTrigger con pin-spacers.
 * Garantiza 0 margen de error en navegación a hashes (#contacto, #servicios, #tienda)
 * evitando rebotes a Inicio, bloqueos de scroll y desfasajes de coordenadas.
 */

interface CustomWindow extends Window {
  __lenis?: {
    scroll: number;
    actualScroll: number;
    targetScroll: number;
    animatedScroll: number;
    limit: number;
    isStopped: boolean;
    isLocked: boolean;
    resize: () => void;
    start: () => void;
    scrollTo: (
      target: HTMLElement | string | number,
      opts?: {
        offset?: number;
        duration?: number;
        immediate?: boolean;
        lock?: boolean;
        force?: boolean;
        onComplete?: () => void;
      }
    ) => void;
  };
  ScrollTrigger?: {
    refresh: () => void;
    update: () => void;
  };
}

export function scrollToHash(
  hashOrId: string,
  options: { offset?: number; duration?: number; immediate?: boolean; onComplete?: () => void } = {}
) {
  if (typeof window === "undefined") return;

  const hash = hashOrId.startsWith("#") ? hashOrId : `#${hashOrId}`;
  const id = hash.slice(1);
  const offset = options.offset ?? -72; // Espacio libre perfecto bajo el Navbar fijo

  const executeScroll = (retryCount = 0) => {
    const target = document.getElementById(id);
    if (!target) {
      if (retryCount < 5) {
        setTimeout(() => executeScroll(retryCount + 1), 50);
      }
      return;
    }

    const win = window as unknown as CustomWindow;

    // 1. Refrescar ScrollTrigger y Lenis para asegurar que las dimensiones de
    // pin-spacers de HeroExploded estén calculadas al 100%
    if (win.ScrollTrigger?.refresh) {
      try {
        win.ScrollTrigger.refresh();
      } catch {
        // Safe guard
      }
    }

    if (win.__lenis && typeof win.__lenis.resize === "function") {
      try {
        win.__lenis.resize();
      } catch {
        // Safe guard
      }
    }

    // 2. Cálculo algebraico exacto de posición absoluta en el documento
    // Identidad geométrica: absoluteTop = rect.top + window.scrollY
    const currentScrollY = win.__lenis?.scroll ?? window.scrollY;
    const rect = target.getBoundingClientRect();
    const absoluteTargetY = Math.max(0, Math.round(rect.top + window.scrollY + offset));

    const lenis = win.__lenis;
    let didMove = false;

    if (lenis && typeof lenis.scrollTo === "function") {
      // Si Lenis estaba en pausa o bloqueado, desbloquear
      if (typeof lenis.start === "function" && lenis.isStopped) {
        lenis.start();
      }

      lenis.scrollTo(absoluteTargetY, {
        offset: 0,
        duration: options.immediate ? 0 : (options.duration ?? 0.85),
        immediate: options.immediate ?? false,
        lock: false,
        force: true, // Forzar la ejecución incluso si Lenis estaba en reposo
        onComplete: () => {
          options.onComplete?.();
        },
      });
      didMove = true;
    }

    // 3. Fallback hiper-robusto: Si Lenis no está disponible o el scroll no avanzó
    // tras 120ms (por GPU lag o ticker desincronizado), ejecutar desplazamiento nativo suave
    const startY = window.scrollY;
    setTimeout(() => {
      const currentY = window.scrollY;
      const progressMade = Math.abs(currentY - startY);
      const remaining = Math.abs(currentY - absoluteTargetY);

      if (remaining > 60 && progressMade < 15) {
        // Lenis no respondió: activar motor nativo del navegador
        window.scrollTo({
          top: absoluteTargetY,
          behavior: options.immediate ? "auto" : "smooth",
        });
      }
    }, 120);

    if (!didMove) {
      window.scrollTo({
        top: absoluteTargetY,
        behavior: options.immediate ? "auto" : "smooth",
      });
    }
  };

  executeScroll();
}

export function scrollToTop(options: { duration?: number; immediate?: boolean; onComplete?: () => void } = {}) {
  if (typeof window === "undefined") return;

  const win = window as unknown as CustomWindow;
  const lenis = win.__lenis;

  if (lenis && typeof lenis.scrollTo === "function") {
    if (typeof lenis.start === "function" && lenis.isStopped) {
      lenis.start();
    }
    lenis.scrollTo(0, {
      duration: options.immediate ? 0 : (options.duration ?? 0.75),
      immediate: options.immediate ?? false,
      lock: false,
      force: true,
      onComplete: () => {
        options.onComplete?.();
      },
    });
  } else {
    window.scrollTo({
      top: 0,
      behavior: options.immediate ? "auto" : "smooth",
    });
  }
}
