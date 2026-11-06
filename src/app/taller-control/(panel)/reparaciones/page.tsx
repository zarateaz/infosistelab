import { Search } from "lucide-react";
import { getAdminRepairs } from "./actions";
import { AddRepairForm } from "./AddRepairForm";
import { RepairRow } from "./RepairRow";

export default async function AdminRepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ dni?: string }>;
}) {
  const { dni } = await searchParams;
  const repairs = await getAdminRepairs(dni);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Reparaciones</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {repairs.length} reparación{repairs.length === 1 ? "" : "es"}
            {dni ? ` para "${dni}"` : ""}.
          </p>
        </div>

        <form className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            name="dni"
            defaultValue={dni}
            placeholder="Buscar por DNI..."
            className="w-64 rounded-xl border border-border bg-bg-alt py-2.5 pl-10 pr-4 text-sm text-fg outline-none focus:border-accent"
          />
        </form>
      </div>

      <div className="mt-8">
        <AddRepairForm />
      </div>

      <div className="mt-8 space-y-4">
        {repairs.map((repair) => (
          <RepairRow key={repair.id} repair={repair} />
        ))}

        {repairs.length === 0 && (
          <div className="admin-glass rounded-[var(--radius-lg)] px-6 py-14 text-center text-fg-muted">
            {dni ? "Ninguna reparación coincide con ese DNI." : "Todavía no hay reparaciones."}
          </div>
        )}
      </div>
    </div>
  );
}
