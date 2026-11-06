"use client";

import { useEffect, useRef } from "react";
import { gsap, registerGsap } from "@/lib/gsap/registerGsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Generic scroll-triggered fade/rise reveal. Wraps a section (or a piece of
 * one) and animates it in once it crosses into the viewport. Pure
 * transform/opacity — GPU compositable, cheap on mobile.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !ref.current) return;
    registerGsap();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 88%",
            once: true,
            toggleActions: "play none none none",
          },
        }
      );
    });

    return () => ctx.revert();
  }, [reducedMotion, delay, y]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
