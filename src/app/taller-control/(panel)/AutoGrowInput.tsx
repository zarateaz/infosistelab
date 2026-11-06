"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows">;

function resize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/** Drop-in replacement for a single-line `<input type="text">` on any
 *  free-text field a person might type more into than the box is wide for
 *  (Descripción, Concepto, Observaciones) — reported directly: a long
 *  description scrolls past the visible edge of the field and "no logra
 *  ver el texto completo". At rest, one short line, indistinguishable from
 *  a normal input. Past that, it silently wraps and grows taller instead
 *  of scrolling sideways, so everything typed stays visible without
 *  needing to select-all or hover a tooltip to check it.
 *
 *  Same props as a native field — value/onChange, defaultValue/name — so
 *  it drops into both controlled rows (edit forms) and uncontrolled
 *  `<form action>` submissions (FormData picks up a <textarea>'s value by
 *  `name` exactly like an <input>'s) without changing anything else. */
export function AutoGrowInput({ className, onInput, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Sizes to the initial value on mount — e.g. opening an edit form whose
  // draft already has a long description — before any keystroke fires
  // onInput.
  useLayoutEffect(() => {
    if (ref.current) resize(ref.current);
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      onInput={(e) => {
        resize(e.currentTarget);
        onInput?.(e);
      }}
      className={`resize-none overflow-hidden leading-normal ${className ?? ""}`}
      {...rest}
    />
  );
}
