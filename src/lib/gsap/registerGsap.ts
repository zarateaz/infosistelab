"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/**
 * Registers the ScrollTrigger plugin exactly once, no matter how many
 * components import it. GSAP plugin registration is idempotent-unsafe to
 * call repeatedly during React StrictMode double-invoked effects, hence the
 * guard.
 */
export function registerGsap() {
  if (registered) return gsap;
  gsap.registerPlugin(ScrollTrigger);
  if (typeof window !== "undefined") {
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
  registered = true;
  return gsap;
}

export { gsap, ScrollTrigger };
