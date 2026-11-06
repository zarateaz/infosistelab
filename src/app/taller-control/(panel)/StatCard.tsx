import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type StatTint = "blue" | "violet" | "emerald" | "amber" | "cyan" | "red" | "fuchsia" | "teal" | "slate";

// One shared color language for every stat-card grid across the admin
// panel (Dashboard, Facturas, Ventas, Servicios, Caja) — each card gets a
// distinct accent instead of every metric reading as the same flat blue.
const TINTS: Record<StatTint, string> = {
  blue: "bg-accent/10 text-accent shadow-[0_0_20px_-6px_rgba(10,95,219,0.5)] group-hover:bg-accent group-hover:text-accent-fg",
  violet:
    "bg-violet-500/10 text-violet-600 shadow-[0_0_20px_-6px_rgba(139,92,246,0.5)] group-hover:bg-violet-500 group-hover:text-white",
  emerald:
    "bg-emerald-500/10 text-emerald-600 shadow-[0_0_20px_-6px_rgba(16,185,129,0.5)] group-hover:bg-emerald-500 group-hover:text-white",
  amber:
    "bg-amber-500/10 text-amber-600 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] group-hover:bg-amber-500 group-hover:text-white",
  cyan: "bg-cyan-500/10 text-cyan-600 shadow-[0_0_20px_-6px_rgba(6,182,212,0.5)] group-hover:bg-cyan-500 group-hover:text-white",
  fuchsia:
    "bg-fuchsia-500/10 text-fuchsia-600 shadow-[0_0_20px_-6px_rgba(217,70,239,0.5)] group-hover:bg-fuchsia-500 group-hover:text-white",
  teal: "bg-teal-500/10 text-teal-600 shadow-[0_0_20px_-6px_rgba(20,184,166,0.5)] group-hover:bg-teal-500 group-hover:text-white",
  red: "bg-red-500/10 text-red-600 shadow-[0_0_20px_-6px_rgba(220,38,38,0.5)] group-hover:bg-red-500 group-hover:text-white",
  slate: "bg-fg-muted/10 text-fg-muted shadow-none group-hover:bg-fg-muted group-hover:text-white",
};

const CARD_CLASS =
  "group admin-glass flex items-center gap-4 rounded-[var(--radius-lg)] p-5 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10";

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint = "blue",
  warn,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string | null;
  tint?: StatTint;
  warn?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${TINTS[warn ? "red" : tint]}`}
      >
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-2xl font-extrabold tracking-tight text-fg">{value}</p>
        <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wider text-fg-muted">{label}</p>
        {sub && <p className="mt-0.5 truncate text-[11px] text-fg-muted/70">{sub}</p>}
      </div>
    </>
  );

  return href ? (
    <Link href={href} className={CARD_CLASS}>
      {content}
    </Link>
  ) : (
    <div className={CARD_CLASS}>{content}</div>
  );
}
