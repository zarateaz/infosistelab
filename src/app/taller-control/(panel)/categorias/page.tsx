import { getCategories } from "@/app/tienda/actions";
import { AddCategoryForm } from "./AddCategoryForm";
import { CategoryChip } from "./CategoryChip";

// Same tint language as StatCard's icon tiles — a colored soft background,
// colored text, and a matching glow shadow — cycled across letter groups so
// scanning 56 categories reads as a colorful A-Z index instead of one long
// gray wall of identical chips.
const TINTS = [
  "bg-accent/10 text-accent shadow-[0_0_16px_-6px_rgba(10,95,219,0.6)]",
  "bg-violet-500/10 text-violet-600 shadow-[0_0_16px_-6px_rgba(139,92,246,0.6)]",
  "bg-emerald-500/10 text-emerald-600 shadow-[0_0_16px_-6px_rgba(16,185,129,0.6)]",
  "bg-amber-500/10 text-amber-600 shadow-[0_0_16px_-6px_rgba(245,158,11,0.6)]",
  "bg-cyan-500/10 text-cyan-600 shadow-[0_0_16px_-6px_rgba(6,182,212,0.6)]",
  "bg-fuchsia-500/10 text-fuchsia-600 shadow-[0_0_16px_-6px_rgba(217,70,239,0.6)]",
  "bg-teal-500/10 text-teal-600 shadow-[0_0_16px_-6px_rgba(20,184,166,0.6)]",
  "bg-red-500/10 text-red-600 shadow-[0_0_16px_-6px_rgba(220,38,38,0.6)]",
];

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  // categories already arrives sorted name asc (see getCategories) —
  // grouping by first letter just turns 56 chips in a row into a scannable
  // A-Z index instead of a wall of text.
  const groups: { letter: string; items: typeof categories }[] = [];
  for (const c of categories) {
    const letter = c.name.charAt(0).toUpperCase();
    const current = groups[groups.length - 1];
    if (current && current.letter === letter) current.items.push(c);
    else groups.push({ letter, items: [c] });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Categorías</h1>
      <p className="mt-1 text-sm text-fg-muted">{categories.length} categorías en el catálogo.</p>

      <div className="mt-8 space-y-6">
        <div className="admin-glass rounded-[var(--radius-lg)] p-6">
          <h2 className="font-display text-lg font-bold text-fg">Gestionar categorías</h2>
          <div className="mt-5">
            <AddCategoryForm />
          </div>
        </div>

        <div className="admin-glass rounded-[var(--radius-lg)] p-6">
          {/* Jump-to-letter index — plain anchor links, no JS needed, and
              genuinely useful once there are 56+ categories to scroll past. */}
          <div className="mb-6 flex flex-wrap gap-1.5 border-b border-border pb-5">
            {groups.map((group, i) => (
              <a
                key={group.letter}
                href={`#letra-${group.letter}`}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold transition-transform hover:scale-110 ${TINTS[i % TINTS.length]}`}
              >
                {group.letter}
              </a>
            ))}
          </div>

          {groups.map((group, i) => (
            <div key={group.letter} id={`letra-${group.letter}`} className="mb-6 scroll-mt-6 last:mb-0">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${TINTS[i % TINTS.length]}`}
                >
                  {group.letter}
                </span>
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-fg-muted">
                  {group.items.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {group.items.map((c) => (
                  <CategoryChip key={c.id} id={c.id} name={c.name} />
                ))}
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="w-full py-10 text-center text-sm font-medium text-fg-muted">No hay categorías.</p>
          )}
        </div>
      </div>
    </div>
  );
}
