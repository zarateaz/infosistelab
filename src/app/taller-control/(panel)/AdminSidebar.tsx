"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DashboardIcon,
  RealCalculatorIcon,
  SecurityIcon,
  WifiShieldIcon,
  CashRegisterIcon,
  OrdersBagIcon,
  SalesTrendIcon,
  KioskTouchIcon,
  MonthlyReportIcon,
  QuotationIcon,
  TrashBinIcon,
  InvoiceBillIcon,
  AccountsFinanceIcon,
  WarehouseInventoryIcon,
  ProductsPackageIcon,
  CategoriesTagsIcon,
  DiscountsTagIcon,
  StockTrackerRadarIcon,
  RepairsWrenchIcon,
  TechServicesIcon,
  UsersAdminIcon,
  DebtsScheduleIcon,
} from "@/components/admin/SidebarIcons";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; active?: boolean }>> = {
  "/taller-control": DashboardIcon,
  "/taller-control/calculadora": RealCalculatorIcon,
  "/taller-control/seguridad": SecurityIcon,
  "/taller-control/caja": CashRegisterIcon,
  "/taller-control/cobranza-internet": WifiShieldIcon,
  "/taller-control/inventario": WarehouseInventoryIcon,
  "/taller-control/productos": ProductsPackageIcon,
  "/taller-control/categorias": CategoriesTagsIcon,
  "/taller-control/reparaciones": RepairsWrenchIcon,
  "/taller-control/servicios": TechServicesIcon,
  "/taller-control/pedidos": OrdersBagIcon,
  "/taller-control/ventas": SalesTrendIcon,
  "/taller-control/catalogo": KioskTouchIcon,
  "/taller-control/descuentos": DiscountsTagIcon,
  "/taller-control/seguimiento-stock": StockTrackerRadarIcon,
  "/taller-control/reporte-mensual": MonthlyReportIcon,
  "/taller-control/cotizaciones": QuotationIcon,
  "/taller-control/papelera": TrashBinIcon,
  "/taller-control/facturas": InvoiceBillIcon,
  "/taller-control/cuentas": AccountsFinanceIcon,
  "/taller-control/deudas": DebtsScheduleIcon,
  "/taller-control/usuarios": UsersAdminIcon,
};

// Groups the flat nav list into labeled sections purely for display — the
// actual link list (and its role-based filtering, e.g. Usuarios only for
// superadmin) stays owned by layout.tsx. A link whose href isn't in here
// falls back to "General" so a future addition never silently disappears.
const GROUP_OF: Record<string, string> = {
  "/taller-control": "General",
  "/taller-control/calculadora": "General",
  "/taller-control/catalogo": "Ventas",
  "/taller-control/seguridad": "General",
  "/taller-control/caja": "Ventas",
  "/taller-control/cobranza-internet": "Ventas",
  "/taller-control/pedidos": "Ventas",
  "/taller-control/ventas": "Ventas",
  "/taller-control/descuentos": "Inventario",
  "/taller-control/seguimiento-stock": "Inventario",
  "/taller-control/reporte-mensual": "Ventas",
  "/taller-control/cotizaciones": "Ventas",
  "/taller-control/papelera": "Ventas",
  "/taller-control/facturas": "Ventas",
  "/taller-control/cuentas": "Ventas",
  "/taller-control/deudas": "Ventas",
  "/taller-control/inventario": "Inventario",
  "/taller-control/productos": "Inventario",
  "/taller-control/categorias": "Inventario",
  "/taller-control/reparaciones": "Servicio técnico",
  "/taller-control/servicios": "Servicio técnico",
  "/taller-control/usuarios": "Sistema",
};
const GROUP_ORDER = ["General", "Ventas", "Inventario", "Servicio técnico", "Sistema"];

type NavLink = { href: string; label: string };

export function AdminSidebar({
  navLinks,
  username,
  logoutAction,
}: {
  navLinks: NavLink[];
  username?: string;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Exact match for the dashboard root; otherwise a prefix match, so
  // /taller-control/productos/abc123 still highlights "Productos".
  const isActive = (href: string) =>
    href === "/taller-control" ? pathname === href : pathname.startsWith(href);

  const groupedLinks = GROUP_ORDER.map((group) => ({
    group,
    links: navLinks.filter((link) => (GROUP_OF[link.href] ?? "General") === group),
  })).filter((g) => g.links.length > 0);

  const NavList = (
    <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-2">
      {groupedLinks.map(({ group, links }, i) => (
        <div key={group} className={i > 0 ? "mt-3.5" : undefined}>
          <div className="flex items-center gap-1.5 px-3.5 pb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-fg-muted/70">
              {group}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {links.map((link) => {
              const Icon = ICONS[link.href] ?? DashboardIcon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all duration-150 touch-manipulation active:scale-[0.98] ${
                    active
                      ? "bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-[0_4px_16px_-2px_rgba(10,95,219,0.45)] translate-x-0.5"
                      : "text-fg/80 hover:translate-x-1 hover:bg-bg-raised/90 hover:text-fg hover:shadow-sm"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.9)]" />
                  )}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 group-hover:scale-105 ${
                      active
                        ? "border-white/30 bg-white/20 shadow-inner"
                        : "border-border/60 bg-bg-surface/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] group-hover:border-border-strong group-hover:bg-bg-surface"
                    }`}
                  >
                    <Icon size={20} active={active} />
                  </div>
                  <span className="truncate leading-none">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar — sidebar is off-canvas below md */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-bg-alt/95 px-4 py-3 shadow-[0_4px_20px_-8px_rgba(10,30,80,0.12)] backdrop-blur-md md:hidden">
        <Image
          src="/brand/infosistel-logo-v3.png"
          alt="Infosistel"
          width={1366}
          height={166}
          priority
          unoptimized
          className="h-6 w-auto object-contain"
        />
        <div className="flex items-center gap-2">
          <ThemeToggle variant="icon" />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="rounded-xl border border-border-strong p-2 text-fg transition-transform duration-100 touch-manipulation active:scale-95 hover:border-accent hover:text-accent"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 transition-opacity duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="admin-sidebar absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-2xl transition-transform duration-200 ease-out will-change-transform">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <Image
                src="/brand/infosistel-logo-v3.png"
                alt="Infosistel"
                width={1366}
                height={166}
                unoptimized
                className="h-6 w-auto object-contain"
              />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-fg-muted transition-transform duration-100 touch-manipulation active:scale-95 hover:text-fg"
              >
                <X size={20} />
              </button>
            </div>
            {NavList}
            <SidebarFooter username={username} logoutAction={logoutAction} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar — fixed, always visible */}
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col md:flex">
        <div className="border-b border-border/60 px-5 py-6">
          <Image
            src="/brand/infosistel-logo-v3.png"
            alt="Infosistel"
            width={1366}
            height={166}
            priority
            unoptimized
            className="h-7 w-auto object-contain"
          />
        </div>
        {NavList}
        <SidebarFooter username={username} logoutAction={logoutAction} />
      </aside>
    </>
  );
}

function SidebarFooter({
  username,
  logoutAction,
}: {
  username?: string;
  logoutAction: () => Promise<void>;
}) {
  return (
    <div className="border-t border-border/60 bg-gradient-to-b from-transparent to-bg-raised/40 px-3.5 py-3.5">
      <div className="mb-2.5">
        <ThemeToggle variant="sidebar" />
      </div>
      <div className="mb-2.5 flex items-center justify-between rounded-xl border border-border/50 bg-bg-surface/90 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-[0_2px_8px_-1px_rgba(10,95,219,0.5)]">
            {username?.slice(0, 2).toUpperCase() ?? "AD"}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="truncate text-left">
            <p className="truncate text-xs font-bold text-fg leading-none">{username ?? "Administrador"}</p>
            <p className="mt-0.5 text-[10px] font-medium text-emerald-600 leading-none">En línea</p>
          </div>
        </div>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-bg-surface/80 px-3 py-2 text-xs font-semibold text-fg-muted transition-all duration-150 hover:border-red-300 hover:bg-red-50/50 hover:text-red-600 hover:shadow-sm"
        >
          <LogOut size={13} />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
