import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";
import { logoutAction } from "../login/actions";
import { AdminSidebar } from "./AdminSidebar";
import { AdminChatBot } from "@/components/AdminChatBot";

const NAV_LINKS = [
  { href: "/taller-control", label: "Dashboard" },
  { href: "/taller-control/calculadora", label: "Calculadora de Precios" },
  { href: "/taller-control/caja", label: "Caja" },
  { href: "/taller-control/cobranza-internet", label: "Cobranza de Internet" },
  { href: "/taller-control/inventario", label: "Inventario" },
  { href: "/taller-control/productos", label: "Productos" },
  { href: "/taller-control/categorias", label: "Categorías" },
  { href: "/taller-control/reparaciones", label: "Reparaciones" },
  { href: "/taller-control/servicios", label: "Servicios técnicos" },
  { href: "/taller-control/pedidos", label: "Pedidos" },
  { href: "/taller-control/ventas", label: "Ventas" },
  { href: "/taller-control/catalogo", label: "Catálogo Kiosco Táctil" },
  { href: "/taller-control/descuentos", label: "Descuentos de Stock" },
  { href: "/taller-control/seguimiento-stock", label: "Seguimiento de Stock" },
  { href: "/taller-control/reporte-mensual", label: "Reporte Mensual" },
  { href: "/taller-control/cotizaciones", label: "Cotizaciones" },
  { href: "/taller-control/papelera", label: "Papelera" },
  { href: "/taller-control/facturas", label: "Facturas" },
  { href: "/taller-control/cuentas", label: "Cuentas" },
  { href: "/taller-control/deudas", label: "Deudas" },
  { href: "/taller-control/seguridad", label: "Seguridad" },
];

const SUPERADMIN_NAV_LINKS = [{ href: "/taller-control/usuarios", label: "Usuarios" }];

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects unauthenticated requests to /taller-control/login —
  // this re-check is defense-in-depth, and is how the sidebar gets the
  // username without a second round trip from every page.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const navLinks = session?.role === "superadmin" ? [...NAV_LINKS, ...SUPERADMIN_NAV_LINKS] : NAV_LINKS;

  return (
    <div className="bg-aurora min-h-screen relative">
      <AdminSidebar
        navLinks={navLinks}
        username={session?.username as string | undefined}
        logoutAction={logoutAction}
      />
      <main className="px-3.5 py-6 md:ml-64 md:px-8 md:py-8 lg:px-10 2xl:px-14 min-h-screen">
        <div className="mx-auto w-full max-w-[1760px] 2xl:max-w-[1960px]">{children}</div>
      </main>
      <AdminChatBot />
    </div>
  );
}
