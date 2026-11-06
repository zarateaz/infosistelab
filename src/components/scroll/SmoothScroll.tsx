"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/gsap/registerGsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { scrollToHash } from "@/lib/scrollUtils";

/**
 * Drives Lenis from GSAP's own ticker (instead of Lenis's default internal
 * rAF loop) so smooth-scroll and ScrollTrigger never drift out of sync —
 * the integration GSAP's own docs recommend for ScrollTrigger + Lenis.
 */
function LenisGsapSync() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    registerGsap();

    // Expose lenis and ScrollTrigger for coordinate-synchronized programmatic scrolling
    const win = window as unknown as {
      __lenis?: typeof lenis;
      ScrollTrigger?: typeof ScrollTrigger;
    };
    win.__lenis = lenis;
    win.ScrollTrigger = ScrollTrigger;

    // Desactivar la restauración nativa del navegador para evitar que salte
    // a posiciones desfasadas antes de que ScrollTrigger arme sus pin-spacers
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const onStRefresh = () => {
      lenis.resize();
    };
    ScrollTrigger.addEventListener("refresh", onStRefresh);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Si la URL inicial ya contiene un hash (ej: #contacto o #servicios),
    // programar el salto suave una vez que ScrollTrigger termine de medir el DOM
    const initialHash = window.location.hash;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    if (initialHash && (initialHash === "#contacto" || initialHash === "#servicios")) {
      initialTimer = setTimeout(() => {
        scrollToHash(initialHash, { duration: 0.85 });
      }, 250);
    }

    // Escuchar cambios de hash por interacción manual de URL
    const onHashChange = () => {
      if (window.location.hash) {
        scrollToHash(window.location.hash);
      }
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      window.removeEventListener("hashchange", onHashChange);
      ScrollTrigger.removeEventListener("refresh", onStRefresh);
      delete win.__lenis;
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(tick);
    };
  }, [lenis]);

  return null;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();

  // With reduced motion requested, skip Lenis entirely — native scroll
  // already respects the OS setting, and inertia/lerp is exactly the kind
  // of motion that setting exists to suppress.
  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.12, duration: 0.85, smoothWheel: true, syncTouch: false, anchors: false }}>
      <LenisGsapSync />
      {children}
    </ReactLenis>
  );
}
