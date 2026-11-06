"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Laptop, Printer, Cpu } from "lucide-react";
import { gsap, registerGsap } from "@/lib/gsap/registerGsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const SLIDES = [
  { src: "/img/hero-laptop.jpg", label: "Laptops", icon: Laptop },
  { src: "/img/hero-printer.jpg", label: "Impresoras", icon: Printer },
  { src: "/img/hero-pc.jpg", label: "PCs", icon: Cpu },
] as const;

const HOLD = 3.4;
const CROSSFADE = 0.9;

const SPARKS = [
  { r: 58, size: 8, angle: 0 },
  { r: 50, size: 6, angle: 90 },
  { r: 64, size: 5, angle: 180 },
  { r: 54, size: 7, angle: 270 },
];

const TILT_MAX_DEG = 8;

/**
 * Hero centerpiece — alternative to the bento mosaic: a single cinematic
 * frame that auto-advances through the same three product photos with a
 * crossfade + slow Ken Burns zoom, Instagram-style progress dots, a
 * spinning aura + orbiting satellites behind it for the same "always
 * moving" ambient life, and a bonus pointer-driven 3D tilt + glare on
 * hover. Pure CSS/SVG/GSAP, no new dependency, static single frame under
 * prefers-reduced-motion.
 */
export function HeroVisual() {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const glareRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    if (reducedMotion) {
      gsap.set(slideRefs.current[0], { opacity: 1 });
      gsap.set(labelRefs.current[0], { opacity: 1 });
      gsap.set(frameRef.current, { opacity: 1 });
      return;
    }

    registerGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        frameRef.current,
        { opacity: 0, scale: 0.94 },
        { opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" }
      );
      gsap.from(sealRef.current, { opacity: 0, scale: 0.5, duration: 0.5, ease: "back.out(2)", delay: 0.6 });

      gsap.to(auraRef.current, { rotate: 360, duration: 16, repeat: -1, ease: "none" });
      gsap.to(orbitRef.current, { rotate: 360, duration: 20, repeat: -1, ease: "none" });

      // Auto-advancing carousel: each loop resets every fill bar and the
      // "next" slide's zoom, then holds while that slide's photo does a
      // slow Ken Burns push-in and its progress dot fills — the same
      // pacing model as a Stories UI, so it reads as intentional rather
      // than a generic fade loop.
      const tl = gsap.timeline({ repeat: -1, delay: 1 });
      tl.set(fillRefs.current, { scaleX: 0 });
      SLIDES.forEach((_, i) => {
        const prev = (i + SLIDES.length - 1) % SLIDES.length;
        tl.addLabel(`s${i}`)
          .set(slideRefs.current[i], { scale: 1 }, `s${i}`)
          .to(slideRefs.current[i], { opacity: 1, duration: CROSSFADE }, `s${i}`)
          .to(slideRefs.current[prev], { opacity: 0, duration: CROSSFADE }, `s${i}`)
          .to(labelRefs.current[i], { opacity: 1, duration: CROSSFADE }, `s${i}`)
          .to(labelRefs.current[prev], { opacity: 0, duration: CROSSFADE }, `s${i}`)
          .to(slideRefs.current[i], { scale: 1.09, duration: HOLD, ease: "none" }, `s${i}`)
          .fromTo(fillRefs.current[i], { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: "none" }, `s${i}`);
      });
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion || !frameRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(frameRef.current, {
      rotateY: px * TILT_MAX_DEG,
      rotateX: -py * TILT_MAX_DEG,
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto",
    });
    const glare = glareRef.current;
    if (glare) {
      glare.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
      glare.style.setProperty("--my", `${(py + 0.5) * 100}%`);
      glare.style.opacity = "1";
    }
  }

  function handlePointerLeave() {
    if (reducedMotion || !frameRef.current) return;
    gsap.to(frameRef.current, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "elastic.out(1, 0.6)", overwrite: "auto" });
    if (glareRef.current) glareRef.current.style.opacity = "0";
  }

  return (
    <div ref={rootRef} className="relative h-full w-full [perspective:1400px]">
      <div
        aria-hidden
        ref={auraRef}
        className="absolute inset-[-15%] rounded-full opacity-70 blur-[80px] bg-[conic-gradient(from_0deg,var(--color-accent)_0%,transparent_20%,var(--color-accent-hover)_45%,transparent_68%,var(--color-accent)_100%)]"
      />
      <svg
        ref={orbitRef}
        aria-hidden
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        style={{ transformOrigin: "50% 50%" }}
      >
        {SPARKS.map((s, i) => (
          <circle
            key={i}
            cx={50 + s.r * Math.cos((s.angle * Math.PI) / 180)}
            cy={50 + s.r * Math.sin((s.angle * Math.PI) / 180)}
            r={s.size / 4}
            className="fill-accent-hover"
            style={{ filter: "drop-shadow(0 0 6px var(--color-accent-hover))" }}
          />
        ))}
      </svg>

      <div
        ref={frameRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-full w-full overflow-hidden rounded-[1.75rem] border border-border bg-bg-alt opacity-0 shadow-[0_30px_70px_-25px_rgba(10,30,80,0.4)] [will-change:transform]"
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.label}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="absolute inset-0"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            <Image
              src={slide.src}
              alt={slide.label}
              fill
              sizes="(min-width: 768px) 576px, 90vw"
              className="object-contain p-10 sm:p-14"
              priority={i === 0}
            />
          </div>
        ))}

        <div
          aria-hidden
          ref={glareRef}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{
            background: "radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.5), transparent 60%)",
          }}
        />

        <div className="absolute left-5 top-5">
          {SLIDES.map((slide, i) => (
            <div
              key={slide.label}
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-bg-alt/95 px-3 py-1.5 shadow-sm ring-1 ring-border"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <slide.icon size={13} className="text-accent" strokeWidth={2} />
              <span className="text-[11px] font-bold text-fg">{slide.label}</span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {SLIDES.map((slide, i) => (
            <div key={slide.label} className="h-1.5 w-9 overflow-hidden rounded-full bg-fg/15">
              <div
                ref={(el) => {
                  fillRefs.current[i] = el;
                }}
                className="h-full w-full origin-left scale-x-0 rounded-full bg-accent"
              />
            </div>
          ))}
        </div>
      </div>

      <div
        ref={sealRef}
        className="absolute -right-3 -top-3 z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-pressed shadow-[0_16px_32px_-10px_rgba(10,95,219,0.55)] ring-1 ring-inset ring-white/15 sm:h-14 sm:w-14"
      >
        <span className="select-none font-display text-base font-extrabold leading-none text-accent-fg sm:text-lg">
          IS
        </span>
      </div>
    </div>
  );
}
