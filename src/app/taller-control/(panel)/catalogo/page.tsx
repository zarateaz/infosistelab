import { Metadata } from "next";
import { Tv, Package, Sparkles, Flame, CheckCircle } from "lucide-react";
import { getCatalogoData } from "@/app/catalogo/actions";
import { StatCard } from "../StatCard";
import { CatalogoAdminToolbar } from "./CatalogoAdminToolbar";
import { CatalogoKiosk } from "@/components/catalogo/CatalogoKiosk";

export const metadata: Metadata = {
  title: "Catálogo Web Kiosco Táctil — Panel de Control",
};

export default async function AdminCatalogoPage() {
  const { products, categories } = await getCatalogoData();

  const totalProducts = products.length;
  const inStock = products.filter((p) => p.stock > 0).length;
  const featured = products.filter((p) => p.isFeatured).length;
  const onSale = products.filter((p) => p.onSale).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500 shadow-sm">
            <Tv size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-fg">
              Catálogo Web Kiosco Táctil
            </h1>
            <p className="text-sm text-fg-muted">
              Plataforma interactiva para pantallas táctiles de mostrador, tablets y exhibición en tienda.
            </p>
          </div>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total en Catálogo"
          value={totalProducts}
          sub="Productos sincronizados"
          tint="cyan"
        />
        <StatCard
          icon={CheckCircle}
          label="Con Stock Inmediato"
          value={inStock}
          sub={`${totalProducts - inStock} agotados`}
          tint="emerald"
        />
        <StatCard
          icon={Sparkles}
          label="Destacados Kiosco"
          value={featured}
          sub="Productos estrella"
          tint="amber"
        />
        <StatCard
          icon={Flame}
          label="En Oferta Activa"
          value={onSale}
          sub="Precios con descuento"
          tint="red"
        />
      </div>

      {/* Barra de herramientas y enlace Kiosco */}
      <CatalogoAdminToolbar />

      {/* Vista previa en vivo del Kiosco interactivo */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-fg">Vista Previa Interactiva en Vivo</h3>
            <p className="text-xs text-fg-muted">
              Puedes probar la navegación táctil, búsqueda con teclado virtual, cotizaciones y códigos QR directamente aquí.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border shadow-2xl overflow-hidden bg-slate-950">
          <CatalogoKiosk
            isAdminPreview={true}
            initialProducts={products}
            initialCategories={categories}
          />
        </div>
      </div>
    </div>
  );
}
