"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

// Server-rendered HTML always assumes motion is fine; the real value is
// read on the client on first paint via getSnapshot above.
function getServerSnapshot() {
  return false;
}

/**
 * Tracks the `prefers-reduced-motion` media query. Every scroll/parallax/
 * preloader animation in this project checks this before running a long or
 * large-displacement animation — accessibility requirement, not decoration.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
