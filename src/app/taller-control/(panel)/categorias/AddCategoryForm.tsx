"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, type CategoryFormState } from "./actions";

const initialState: CategoryFormState = {};

export function AddCategoryForm() {
  const [state, formAction, isPending] = useActionState(createCategory, initialState);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.error && !isPending && inputRef.current) inputRef.current.value = "";
  }, [state, isPending]);

  return (
    <div>
      <form action={formAction} className="flex gap-3">
        <input
          ref={inputRef}
          name="name"
          type="text"
          placeholder="Nueva categoría..."
          required
          className="flex-1 rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={isPending}
          className="whitespace-nowrap rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Añadiendo..." : "Añadir"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm font-medium text-red-600">{state.error}</p>}
    </div>
  );
}
