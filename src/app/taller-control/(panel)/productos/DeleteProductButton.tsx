"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "../ConfirmDialog";

export function DeleteProductButton({
  productName,
  action,
}: {
  productName: string;
  action: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Eliminar ${productName}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={15} />
      </button>

      {confirming && (
        <ConfirmDialog
          title="Eliminar producto"
          message={`¿Eliminar "${productName}"? Esta acción no se puede deshacer.`}
          danger
          pending={isPending}
          onConfirm={() => startTransition(async () => { await action(); setConfirming(false); })}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
