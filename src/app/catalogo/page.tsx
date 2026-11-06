import type { Metadata, Viewport } from "next";
import { getCatalogoData } from "./actions";
import { CatalogoKiosk } from "@/components/catalogo/CatalogoKiosk";

export const metadata: Metadata = {
  title: "Catálogo Interactivo Kiosco Táctil — INFOSISTEL",
  description: "Explora repuestos, laptops, periféricos y equipos en nuestra pantalla táctil interactiva con precios y stock en vivo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function CatalogoPage() {
  const { products, categories } = await getCatalogoData();

  return (
    <main className="min-h-screen bg-white selection:bg-blue-600 selection:text-white">
      <CatalogoKiosk initialProducts={products} initialCategories={categories} />
    </main>
  );
}
