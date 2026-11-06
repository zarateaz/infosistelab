/**
 * lib/requireSuperAdmin.ts
 * Gate for the Usuarios section — proxy.ts only checks "is there a valid
 * admin session at all" (see proxy.ts), it doesn't know about roles. Pages
 * that manage other admin accounts call this to additionally require
 * role === "superadmin", redirecting ordinary admins back to the dashboard.
 */
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/requireSession";

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.role !== "superadmin") redirect("/taller-control");
  return session;
}
