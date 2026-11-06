"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ShoppingBag } from "lucide-react";
import { gsap, registerGsap } from "@/lib/gsap/registerGsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { HeroVisual } from "@/components/sections/HeroVisual";

const FEATURES = [
  { label: "Garantía 100%" },
  { label: "Diagnóstico honesto" },
  { label: "Repuestos originales" },
  { label: "Soporte real" },
];

export function Hero() {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const featureStripRef = useRef<HTMLDivElement>(null);

  // Entrance timeline — plays as soon as the Hero mounts.
  useEffect(() => {
    const targets = [
      headlineRef.current,
      subRef.current,
      ctaRef.current,
      imageWrapRef.current,
      featureStripRef.current,
    ];

    if (reducedMotion) {
      gsap.set(targets, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    registerGsap();
    // Plain timeline + kill() on cleanup — deliberately NOT gsap.context()
    // + revert(). This is a one-shot "play once" reveal, not a repeatable
    // scroll trigger: revert() resets elements back to their pre-animation
    // (invisible) state, which is wrong here if a dev-only effect
    // double-invoke fires the cleanup right after the real run starts.
    // kill() just stops ticking wherever it is, leaving visible progress intact.
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(headlineRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 })
      .fromTo(subRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.35")
      .fromTo(ctaRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
      .fromTo(
        imageWrapRef.current,
        { opacity: 0, scale: 0.94 },
        { opacity: 1, scale: 1, duration: 0.9 },
        "-=0.6"
      )
      .fromTo(featureStripRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.3");

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  // Scroll parallax on the hero photo — moves slower than the page, which
  // is what reads as "depth" without any WebGL/3D involved.
  useEffect(() => {
    if (reducedMotion || !imageRef.current) return;
    registerGsap();
    const ctx = gsap.context(() => {
      gsap.to(imageRef.current, {
        yPercent: 10,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={rootRef} className="bg-aurora relative overflow-hidden pb-16 pt-32 md:pt-40">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <h1
              ref={headlineRef}
              className="font-display text-[clamp(2rem,4.2vw,3.25rem)] font-bold leading-tight tracking-tight text-fg opacity-0"
            >
              Reparamos laptops, PC e impresoras
            </h1>

            <p ref={subRef} className="mt-6 max-w-md text-lg text-fg-muted opacity-0">
              Diagnóstico honesto, repuestos reales y garantía sobre cada
              trabajo — en Huancayo.
            </p>

            <div ref={ctaRef} className="mt-9 flex flex-wrap items-center gap-4 opacity-0">
              <Link
                href="/tienda"
                className="group inline-flex items-center gap-2.5 rounded-full bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-accent-fg shadow-lg shadow-accent/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <ShoppingBag size={16} />
                Ir a la tienda
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#servicios"
                className="rounded-full border border-border-strong px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-fg transition-colors hover:border-accent hover:text-accent"
              >
                Ver servicios
              </a>
              <a
                href="https://wa.me/51900000000"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold uppercase tracking-wide text-fg-muted transition-colors hover:text-accent"
              >
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>

          <div ref={imageWrapRef} className="relative mx-auto w-full max-w-xl opacity-0">
            <div ref={imageRef} className="relative aspect-[4/3] w-full">
              <HeroVisual />
            </div>
          </div>
        </div>

        <div
          ref={featureStripRef}
          className="glass-panel mt-8 grid grid-cols-2 gap-6 rounded-[var(--radius-lg)] px-8 py-7 opacity-0 sm:grid-cols-4 md:mt-4"
        >
          {FEATURES.map((f) => (
            <div key={f.label} className="text-center sm:text-left">
              <p className="text-sm font-bold leading-snug text-fg">{f.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 text-fg-muted">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em]">Desliza para descubrir</span>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </div>
    </section>
  );
}
