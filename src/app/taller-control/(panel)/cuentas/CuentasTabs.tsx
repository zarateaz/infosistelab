"use client";

import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export function CuentasTabs({ tab }: { tab: "cobrar" | "pagar" }) {
  const tabs: { key: "cobrar" | "pagar"; label: string; icon: typeof ArrowDownCircle }[] = [
    { key: "cobrar", label: "Por Cobrar", icon: ArrowDownCircle },
    { key: "pagar", label: "Por Pagar", icon: ArrowUpCircle },
  ];

  return (
    <div className="inline-flex gap-1 rounded-full border border-border-strong bg-bg-raised/60 p-1">
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = tab === key;
        return (
          <Link
            key={key}
            href={`/taller-control/cuentas?tab=${key}`}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${
              active ? "bg-accent text-accent-fg shadow-[0_4px_16px_-4px_rgba(10,95,219,0.5)]" : "text-fg-muted hover:text-fg"
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
