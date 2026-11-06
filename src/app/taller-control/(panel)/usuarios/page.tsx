import { User } from "lucide-react";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getAdminUsers, deleteAdminUser } from "./actions";
import { AddAdminForm } from "./AddAdminForm";
import { DeleteAdminButton } from "./DeleteAdminButton";

export default async function AdminUsersPage() {
  await requireSuperAdmin();
  const admins = await getAdminUsers();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-fg">Usuarios</h1>
      <p className="mt-1 text-sm text-fg-muted">{admins.length} cuentas con acceso al panel.</p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AddAdminForm />

        <div className="admin-glass rounded-[var(--radius-lg)] p-6">
          <h2 className="font-display text-lg font-bold text-fg">Administradores</h2>
          <div className="mt-5 space-y-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-xl border border-border bg-bg-raised/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-inner ${
                      admin.role === "superadmin"
                        ? "bg-accent/10 text-accent shadow-[0_0_16px_-4px_rgba(10,95,219,0.35)]"
                        : "bg-bg text-fg-muted"
                    }`}
                  >
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-fg">{admin.username}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                      {admin.role === "superadmin" ? "Super administrador" : "Administrador"}
                    </p>
                  </div>
                </div>
                <DeleteAdminButton
                  username={admin.username}
                  action={async () => {
                    "use server";
                    await deleteAdminUser(admin.id);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
