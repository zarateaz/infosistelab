"use client";

import { useEffect, useRef, useState } from "react";

const EYE_RADIUS = 24;
const PUPIL_MAX_OFFSET = 7;

/** A pair of eyes that track the mouse cursor around the page while the
 *  admin is typing their username, and shut when the password field gets
 *  focus — nobody's peeking while you type your password. Pure CSS/SVG,
 *  no new dependency. Purely decorative (aria-hidden) — never blocks
 *  keyboard-only login. */
export function CuriousEyes({ closed }: { closed: boolean }) {
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);
  const [leftPupil, setLeftPupil] = useState({ x: 0, y: 0 });
  const [rightPupil, setRightPupil] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    function pupilOffsetFor(eyeEl: HTMLDivElement | null, clientX: number, clientY: number) {
      if (!eyeEl) return { x: 0, y: 0 };
      const rect = eyeEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const distance = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(distance, PUPIL_MAX_OFFSET * 6) / (PUPIL_MAX_OFFSET * 6);
      return { x: (dx / distance) * PUPIL_MAX_OFFSET * clamped, y: (dy / distance) * PUPIL_MAX_OFFSET * clamped };
    }

    function handleMove(e: MouseEvent) {
      setLeftPupil(pupilOffsetFor(leftEyeRef.current, e.clientX, e.clientY));
      setRightPupil(pupilOffsetFor(rightEyeRef.current, e.clientX, e.clientY));
    }

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Subtle natural blink every few seconds
  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    let resetTimer: ReturnType<typeof setTimeout>;

    function scheduleBlink() {
      const delay = Math.random() * 3500 + 2500;
      blinkTimer = setTimeout(() => {
        setBlinking(true);
        resetTimer = setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, 130);
      }, delay);
    }

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(resetTimer);
    };
  }, []);

  const isClosed = closed || blinking;

  return (
    <div
      aria-hidden
      className="relative mx-auto flex w-fit items-center justify-center gap-3.5 rounded-full border border-[#0a5fdb]/20 bg-[#eaf1ff] px-5 py-2.5 shadow-[0_8px_24px_-6px_rgba(10,95,219,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]"
    >
      <Eye eyeRef={leftEyeRef} pupil={leftPupil} closed={isClosed} />
      <Eye eyeRef={rightEyeRef} pupil={rightPupil} closed={isClosed} />
    </div>
  );
}

function Eye({
  eyeRef,
  pupil,
  closed,
}: {
  eyeRef: React.RefObject<HTMLDivElement | null>;
  pupil: { x: number; y: number };
  closed: boolean;
}) {
  return (
    <div
      ref={eyeRef}
      className="relative overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgba(11,18,48,0.12),inset_0_2px_4px_rgba(11,18,48,0.06)]"
      style={{
        width: EYE_RADIUS * 2,
        height: EYE_RADIUS * 2,
        border: "2.5px solid #0b1230",
      }}
    >
      {/* Iris & Pupil in Infosistel corporate blue & navy */}
      <div
        className="absolute flex items-center justify-center rounded-full bg-[#0a5fdb] transition-transform duration-75 ease-out"
        style={{
          width: 20,
          height: 20,
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${pupil.x}px), calc(-50% + ${pupil.y}px))`,
        }}
      >
        <div className="h-2.5 w-2.5 rounded-full bg-[#0b1230]" />
        <div className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white/90" />
      </div>
      {/* Eyelid — slides down from the top on password focus */}
      <div
        className="absolute inset-x-0 top-0 origin-top border-b-2 border-[#0a5fdb] bg-gradient-to-b from-[#0b1230] to-[#162454] transition-transform duration-200 ease-in-out"
        style={{ height: "100%", transform: closed ? "scaleY(1)" : "scaleY(0)" }}
      />
    </div>
  );
}
