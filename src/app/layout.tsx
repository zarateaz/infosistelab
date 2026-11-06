import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://infosistel.com.pe";
const SITE_DESCRIPTION =
  "Diagnóstico honesto, repuestos reales y garantía sobre cada trabajo — reparación y venta de laptops, PC e impresoras en Huancayo, Perú.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "INFOSISTEL — Reparación y venta de tecnología en Huancayo",
    template: "%s — INFOSISTEL",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: SITE_URL,
    siteName: "INFOSISTEL",
    title: "INFOSISTEL — Reparación y venta de tecnología en Huancayo",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "INFOSISTEL — Reparación y venta de tecnología en Huancayo",
    description: SITE_DESCRIPTION,
  },
};

// viewportFit: "cover" lets fixed elements (ChatBot/WhatsApp launchers) use
// env(safe-area-inset-bottom) to clear a phone's home-indicator/gesture
// bar instead of guessing a fixed offset — without it, env() always
// resolves to 0. themeColor tints the mobile browser's address bar/status
// bar to match the brand instead of showing default black/white, which is
// the first thing a phone visitor sees before the page even finishes
// loading.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a5fdb",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  // Forces the whole app into dynamic rendering, which the nonce-based CSP
  // in src/proxy.ts requires (a statically-built page can't know the
  // per-request nonce). Any component that needs the actual nonce value —
  // e.g. to pass to a <Script nonce=...> — reads it the same way, locally:
  // (await headers()).get("x-nonce").
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg font-sans transition-colors duration-200">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
