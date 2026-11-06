"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingCart, X } from "lucide-react";
import { SocialLinks } from "@/components/SocialLinks";
import { scrollToHash, scrollToTop } from "@/lib/scrollUtils";

const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/#servicios" },
  { label: "Tienda", href: "/tienda" },
  { label: "Seguimiento", href: "/seguimiento" },
  { label: "Contacto", href: "/#contacto" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [activeHash, setActiveHash] = useState<string>("");
  const isNavigatingRef = useRef(false);
  const navLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);

      // Si hay una navegación programática en curso hacia un hash (ej: #contacto),
      // no sobreescribir activeHash para que la píldora permanezca fija en el destino
      if (isNavigatingRef.current) return;

      if (pathname === "/") {
        const vh = window.innerHeight;
        const contactoEl = document.getElementById("contacto");
        if (contactoEl && contactoEl.getBoundingClientRect().top <= vh * 0.45) {
          setActiveHash("#contacto");
          return;
        }

        const serviciosEl = document.getElementById("servicios");
        if (serviciosEl && serviciosEl.getBoundingClientRect().top <= vh * 0.45) {
          setActiveHash("#servicios");
          return;
        }

        setActiveHash("");
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (navLockTimerRef.current) clearTimeout(navLockTimerRef.current);
    };
  }, [pathname]);

  // A route change (tapping a link) should always close the mobile menu —
  // adjusted during render (React's documented pattern) instead of an
  // effect, since an effect would leave the menu open for one extra frame.
  const [menuOpenedForPath, setMenuOpenedForPath] = useState(pathname);
  if (pathname !== menuOpenedForPath) {
    setMenuOpenedForPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMenuOpen(false);

    const isAnchor = href.startsWith("/#") || href === "/";
    if (isAnchor) {
      if (pathname === "/") {
        e.preventDefault();
        isNavigatingRef.current = true;
        if (navLockTimerRef.current) clearTimeout(navLockTimerRef.current);
        navLockTimerRef.current = setTimeout(() => {
          isNavigatingRef.current = false;
        }, 1100);

        if (href === "/") {
          setActiveHash("");
          window.history.pushState(null, "", "/");
          scrollToTop({
            onComplete: () => {
              isNavigatingRef.current = false;
            },
          });
        } else {
          const hash = href.replace("/", "");
          setActiveHash(hash);
          window.history.pushState(null, "", href);
          scrollToHash(hash, {
            onComplete: () => {
              isNavigatingRef.current = false;
            },
          });
        }
      }
    }
  };

  const navContainerRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Sincronizar posición de la píldora física continua al cambiar de ruta o hash
  useEffect(() => {
    const updatePill = () => {
      let activeHref = pathname;
      if (pathname === "/") {
        if (activeHash === "#servicios") activeHref = "/#servicios";
        else if (activeHash === "#contacto") activeHref = "/#contacto";
        else activeHref = "/";
      }

      const activeEl = linkRefs.current[activeHref];
      const containerEl = navContainerRef.current;

      if (activeEl && containerEl) {
        const containerRect = containerEl.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();

        setPillStyle({
          left: elRect.left - containerRect.left,
          width: elRect.width,
          opacity: 1,
        });
      } else {
        setPillStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updatePill();
    window.addEventListener("resize", updatePill, { passive: true });
    return () => window.removeEventListener("resize", updatePill);
  }, [pathname, activeHash]);

  const isLinkActive = (href: string) => {
    if (pathname === "/") {
      if (href === "/") return activeHash === "";
      if (href === "/#servicios") return activeHash === "#servicios";
      if (href === "/#contacto") return activeHash === "#contacto";
      return false;
    }
    return pathname === href;
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? "bg-white/95 shadow-[0_4px_24px_rgba(11,18,48,0.06)] backdrop-blur-md text-fg"
          : "bg-white/80 backdrop-blur-md border-b border-slate-200/60 text-fg"
      }`}
    >
      {/* Línea de acento cibernético ultra fina superior */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-2 sm:px-6 sm:py-3 md:px-10">
        <Link
          href="/"
          scroll={false}
          onClick={(e) => {
            if (pathname === "/") {
              e.preventDefault();
              setActiveHash("");
              scrollToTop();
            }
          }}
          className="flex shrink-0 items-center transition-transform hover:scale-105 max-w-[165px] xs:max-w-[200px] sm:max-w-none"
        >
          <Image
            src="/brand/infosistel-logo-v3.png"
            alt="Infosistel"
            width={1366}
            height={166}
            priority
            className="h-6 sm:h-8 md:h-9 w-auto object-contain"
          />
        </Link>

        {/* Cápsula de navegación flotante con píldora elástica de física continua */}
        <nav
          ref={navContainerRef}
          className="relative hidden items-center rounded-full border border-slate-200/80 bg-slate-100/70 p-1 backdrop-blur-md shadow-sm lg:flex"
        >
          {/* Píldora Líquida Elástica con Física de Resorte (Cubic-Bezier Elastodinámico 120 FPS) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full bg-accent shadow-md shadow-accent/30 transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] transform-gpu will-change-[left,width]"
            style={{
              left: `${pillStyle.left}px`,
              width: `${pillStyle.width}px`,
              top: "4px",
              bottom: "4px",
              opacity: pillStyle.opacity,
            }}
          />

          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(link.href);
            const isAnchor = link.href.startsWith("/#") || link.href === "/";
            return (
              <Link
                key={link.label}
                ref={(node) => {
                  linkRefs.current[link.href] = node;
                }}
                href={link.href}
                scroll={isAnchor ? false : undefined}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`relative z-10 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-slate-700 hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <SocialLinks className="hidden lg:flex" />

          <Link
            href="/tienda"
            aria-label="Ir a la tienda"
            className="rounded-full p-2 text-fg-muted transition-colors hover:text-accent lg:hidden"
          >
            <ShoppingCart size={19} className="sm:w-5 sm:h-5" />
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="rounded-full p-2 text-fg transition-colors hover:text-accent lg:hidden"
          >
            {menuOpen ? <X size={21} className="sm:w-[22px] sm:h-[22px]" /> : <Menu size={21} className="sm:w-[22px] sm:h-[22px]" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-border bg-bg-alt px-6 py-4 lg:hidden">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.href);
              const isAnchor = link.href.startsWith("/#") || link.href === "/";
              return (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    scroll={isAnchor ? false : undefined}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`block rounded-xl px-3 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${
                      isActive
                        ? "bg-accent text-white font-extrabold"
                        : "text-fg-muted hover:bg-bg hover:text-fg"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <SocialLinks className="mt-4 justify-center border-t border-border pt-4" />
        </nav>
      )}
    </header>
  );
}
