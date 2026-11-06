"use client";

import { usePathname } from "next/navigation";
import ChatBot from "@/components/ChatBotLazy";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";

/**
 * The marketing Navbar/Footer/chat widget wrap every page from the root
 * layout — except /taller-control, which is an internal tool with its own topbar
 * (see admin/(panel)/layout.tsx) and has no business showing a WhatsApp
 * chat bubble or "Iniciar sesión" link to someone already logged into it.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isKioskOrAdmin = pathname?.startsWith("/taller-control") || pathname?.startsWith("/catalogo");

  if (isKioskOrAdmin) return <>{children}</>;

  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <WhatsAppButton />
      <ChatBot />
    </>
  );
}
