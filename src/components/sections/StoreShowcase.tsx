import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag, Star, Sparkles, CheckCircle2 } from "lucide-react";
import { getProducts } from "@/app/tienda/actions";
import { CategoryIcon } from "@/components/tienda/categoryIcons";
import { Reveal } from "@/components/scroll/Reveal";

const SHOWCASE_SIZE = 8;

export async function StoreShowcase() {
  const products = await getProducts();
  if (products.length === 0) return null;

  const featured = [...products]
    .sort((a, b) => (a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1))
    .slice(0, SHOWCASE_SIZE);

  return (
    <section id="tienda" className="relative py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/8 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent shadow-sm">
                <Sparkles size={14} className="text-accent" />
                ¡Bienvenido a la Tienda Oficial Infosistel!
              </div>
              <h2 className="mt-2 max-w-2xl font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-tight text-fg">
                Repuestos y equipos listos para llevar
              </h2>
              <p className="mt-3 max-w-xl text-base text-fg-muted">
                ¡Te damos la bienvenida a nuestra tienda virtual! Encuentra cargadores originales,
                pantallas, baterías, repuestos de microelectrónica y laptops certificadas con
                garantía directa de nuestro laboratorio.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-fg-muted">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-alt px-3 py-1 text-fg shadow-xs">
                  <CheckCircle2 size={13} className="text-accent" /> Stock en Huancayo
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-alt px-3 py-1 text-fg shadow-xs">
                  <CheckCircle2 size={13} className="text-accent" /> Envíos a todo el Perú
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-alt px-3 py-1 text-fg shadow-xs">
                  <CheckCircle2 size={13} className="text-accent" /> Garantía de laboratorio
                </span>
              </div>
            </div>

            <Link
              href="/tienda"
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-accent-fg shadow-lg shadow-accent/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ShoppingBag size={16} />
              Explorar toda la tienda
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((product, i) => (
            <Reveal key={product.id} delay={(i % 4) * 0.06}>
              <Link
                href="/tienda"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-alt transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10"
              >
                <div className="relative aspect-square bg-bg">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                      className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <CategoryIcon
                        category={product.category}
                        size={36}
                        strokeWidth={1.25}
                        className="text-fg-muted opacity-40"
                      />
                    </div>
                  )}
                  {product.isFeatured && (
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[9px] font-black text-accent-fg">
                      <Star size={9} fill="currentColor" /> TOP
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                  <span className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-fg-muted">
                    {product.category}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-fg">{product.name}</h3>
                  <div className="mt-auto pt-2">
                    {product.onSale && product.salePrice ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black text-accent">S/. {product.salePrice.toFixed(2)}</span>
                        <span className="text-xs text-fg-muted line-through">S/. {product.price.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-base font-black text-fg">S/. {product.price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-accent"
          >
            Ver todo el catálogo
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
