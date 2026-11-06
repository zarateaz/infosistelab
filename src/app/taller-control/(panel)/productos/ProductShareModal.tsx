"use client";

import { useRef, useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { toPng, toBlob } from "html-to-image";
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  Phone,
  Info,
  Camera,
  Sparkles,
  Loader2,
  Link2,
  MessageCircle,
  ImageIcon,
  Send,
  Palette,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { AdminProduct } from "./actions";

/* ─── types ─── */
interface ProductShareModalProps {
  product: AdminProduct | null;
  onClose: () => void;
}

type FlyerStyle = "elite" | "fresh" | "neon";

/* ─── style options ─── */
const STYLE_OPTIONS: {
  id: FlyerStyle;
  label: string;
  hint: string;
  swatch: string;
  ring: string;
}[] = [
  {
    id: "elite",
    label: "Oscuro premium",
    hint: "Tech",
    swatch: "bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900",
    ring: "border-emerald-500 ring-2 ring-emerald-500/20",
  },
  {
    id: "fresh",
    label: "Claro limpio",
    hint: "Tienda",
    swatch: "bg-gradient-to-br from-white via-slate-100 to-sky-200",
    ring: "border-sky-500 ring-2 ring-sky-500/20",
  },
  {
    id: "neon",
    label: "Neón vibrante",
    hint: "Gaming",
    swatch: "bg-gradient-to-br from-violet-700 via-fuchsia-700 to-cyan-500",
    ring: "border-fuchsia-500 ring-2 ring-fuchsia-500/20",
  },
];

/* ─── helpers ─── */
function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 9) return `51${d}`;
  if (d.length === 11 && d.startsWith("51")) return d;
  return d;
}

/** Evita leer `window`/`navigator` durante el render del servidor y, a la
 *  vez, no provoca un setState dentro de un efecto (regla del linter):
 *  la primera pasada de hidratación usa `false` (igual que el servidor) y
 *  el primer render del cliente ya recibe `true`. */
const subscribeNoop = () => () => {};
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export function ProductShareModal({ product, onClose }: ProductShareModalProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [style, setStyle] = useState<FlyerStyle>("elite");
  const [imgIdx, setImgIdx] = useState(0);
  const [phone, setPhone] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"copied" | "downloaded" | "text" | "error" | null>(null);
  const isClient = useIsClient();
  const origin = isClient ? window.location.origin : "";
  const canNativeShare =
    isClient &&
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function";

  /* close on Escape + lock background scroll */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  /* clear feedback timer on unmount */
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  /* all product photos */
  const photos = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    if (product.image) list.push(product.image);
    if (product.images) {
      try {
        const arr = JSON.parse(product.images);
        if (Array.isArray(arr))
          arr.forEach((s: unknown) => {
            if (typeof s === "string" && s && !list.includes(s)) list.push(s);
          });
      } catch {
        /* skip */
      }
    }
    return list;
  }, [product]);

  const photo = photos[imgIdx] || product?.image || null;
  const price = product
    ? product.onSale && product.salePrice
      ? product.salePrice
      : product.price
    : 0;
  const productUrl = product
    ? `${origin || "https://infosistel.com.pe"}/p/${product.id}`
    : "";
  const fileBase = product
    ? `INFOSISTEL_${product.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 45)}`
    : "INFOSISTEL";

  /* ── render flyer to PNG via html-to-image ──
     Se re-ejecuta al cambiar de producto, estilo o foto. `style` y `photo`
     determinan qué plantilla está montada en el nodo oculto, por eso son
     dependencias del efecto aunque el cuerpo no las lea directamente. */
  useEffect(() => {
    if (!product) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (!flyerRef.current) return;
      setBusy(true);
      try {
        const images = flyerRef.current.querySelectorAll("img");
        await Promise.all(
          Array.from(images).map(
            (img) =>
              img.complete
                ? Promise.resolve()
                : new Promise<void>((res) => {
                    img.onload = () => res();
                    img.onerror = () => res();
                  })
          )
        );

        let b: Blob | null = null;
        try {
          b = await toBlob(flyerRef.current, {
            width: 1080,
            height: 1080,
            pixelRatio: 1,
            cacheBust: true,
          });
        } catch {
          const dataUrl = await toPng(flyerRef.current, {
            width: 1080,
            height: 1080,
            pixelRatio: 1,
            cacheBust: true,
          });
          const res = await fetch(dataUrl);
          b = await res.blob();
        }

        if (cancelled || !b) return;
        setBlob(b);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(b);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } catch {
        /* silent fail — the download/share buttons stay disabled */
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [product, style, photo]);

  if (!product) return null;

  /* ── text for WhatsApp link fallback ── */
  const waText = `*${product.name}*\nPrecio: S/. ${price.toFixed(2)}\n\nVer producto: ${productUrl}\nInfosistel · +51 900 000 000`;

  /* ── actions ── */
  const flash = (value: NonNullable<typeof feedback>) => {
    setFeedback(value);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2800);
  };

  const copyImage = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      flash("copied");
    } catch {
      downloadPng();
    }
  };

  const downloadPng = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `${fileBase}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    flash("downloaded");
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(waText);
      flash("text");
    } catch {
      flash("error");
    }
  };

  const shareNative = async () => {
    if (!blob) return;
    const file = new File([blob], `${fileBase}.png`, {
      type: "image/png",
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: product.name,
          text: `${product.name} — S/. ${price.toFixed(2)}`,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      openWa();
    }
  };

  const openWa = (num?: string) => {
    const u = num
      ? `https://wa.me/${fmtPhone(num)}?text=${encodeURIComponent(waText)}`
      : `https://wa.me/?text=${encodeURIComponent(waText)}`;
    window.open(u, "_blank", "noopener,noreferrer");
  };

  const feedbackMessage =
    feedback === "copied"
      ? "Imagen copiada · pégala en WhatsApp con Ctrl+V"
      : feedback === "downloaded"
        ? "PNG descargado en tu equipo"
        : feedback === "text"
          ? "Texto del mensaje copiado"
          : feedback === "error"
            ? "No se pudo copiar. Descarga la imagen e envíala manualmente."
            : null;

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-product-title"
        className="relative flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-border bg-bg-alt shadow-2xl sm:rounded-3xl"
      >
        {/* ── header ── */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-emerald-500/[0.06] via-transparent to-cyan-500/[0.06] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-600/25">
              <Camera size={19} />
            </div>
            <div className="min-w-0">
              <h2
                id="share-product-title"
                className="truncate text-sm font-extrabold text-fg sm:text-base"
              >
                Compartir producto
              </h2>
              <p className="truncate text-[11px] font-medium text-fg-muted">
                Tarjeta HD 1080×1080 para WhatsApp, estados e Instagram
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600 sm:inline-flex">
              <Sparkles size={11} /> PNG HD
            </span>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-bg hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            {/* LEFT: preview + style + photos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-fg-muted">
                  Vista previa
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-fg-muted">
                  {busy ? (
                    <>
                      <Loader2 size={11} className="animate-spin" /> Generando…
                    </>
                  ) : (
                    <>1080 × 1080 px</>
                  )}
                </span>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-border bg-[#0b1020] p-2 shadow-inner">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#0b1020]">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Vista previa de la tarjeta para WhatsApp"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-white/40">
                      <Loader2 size={26} className="animate-spin" />
                      <span className="text-[11px] font-semibold">
                        Generando tarjeta HD…
                      </span>
                    </div>
                  )}
                  {busy && previewUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                      <span className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white">
                        <Loader2 size={13} className="animate-spin" />
                        Aplicando estilo…
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* style picker */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fg-muted">
                  <Palette size={12} /> Estilo de la tarjeta
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_OPTIONS.map((option) => {
                    const active = style === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setStyle(option.id)}
                        aria-pressed={active}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all active:scale-[0.98] ${
                          active
                            ? option.ring
                            : "border-border bg-bg-alt hover:border-border-strong"
                        }`}
                      >
                        <span
                          className={`h-7 w-7 shrink-0 rounded-lg border border-black/10 shadow-sm ${option.swatch}`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[10px] font-extrabold text-fg">
                            {option.label}
                          </span>
                          <span className="block text-[9px] font-semibold text-fg-muted">
                            {option.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* photo selector */}
              {photos.length > 1 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fg-muted">
                    <ImageIcon size={12} /> Foto principal ({photos.length})
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {photos.map((p, i) => (
                      <button
                        key={p + i}
                        type="button"
                        onClick={() => setImgIdx(i)}
                        aria-label={`Usar foto ${i + 1}`}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                          imgIdx === i
                            ? "border-emerald-500 ring-2 ring-emerald-500/20"
                            : "border-border opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={p}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        {imgIdx === i && (
                          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: product + actions + message */}
            <div className="space-y-3">
              {/* product summary */}
              <div className="rounded-2xl border border-border bg-gradient-to-br from-bg to-bg-alt p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                      #{product.itemNumber} · {product.category}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-black leading-snug text-fg">
                      {product.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span className="font-display text-xl font-black text-fg">
                        S/. {price.toFixed(2)}
                      </span>
                      {product.onSale && product.salePrice && (
                        <span className="text-xs font-bold text-fg-muted line-through">
                          S/. {product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      product.stock > 0
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {product.stock > 0 ? `${product.stock} en stock` : "Agotado"}
                  </span>
                </div>
              </div>

              {/* share image */}
              <div className="space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  <WhatsAppIcon size={12} /> Compartir imagen
                </div>

                <button
                  onClick={copyImage}
                  disabled={!blob || busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 sm:text-sm"
                >
                  {busy ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Generando…
                    </>
                  ) : feedback === "copied" ? (
                    <>
                      <Check size={16} /> ¡Imagen copiada!
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> Copiar imagen
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={downloadPng}
                    disabled={!blob || busy}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg-alt px-3 py-2.5 text-[11px] font-bold text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    <Download size={14} /> Descargar PNG
                  </button>
                  <button
                    onClick={shareNative}
                    disabled={!blob || busy}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg-alt px-3 py-2.5 text-[11px] font-bold text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    <Share2 size={14} />
                    {canNativeShare ? "Compartir" : "Abrir chat"}
                  </button>
                </div>

                <p className="text-center text-[10px] font-medium text-fg-muted">
                  Pega la imagen en WhatsApp Web con{" "}
                  <kbd className="rounded border border-border bg-bg px-1 py-0.5 font-mono text-[9px] font-bold text-fg">
                    Ctrl + V
                  </kbd>
                </p>
              </div>

              {/* message + number */}
              <div className="space-y-3 rounded-2xl border border-border bg-bg-alt p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fg-muted">
                    <MessageCircle size={12} /> Mensaje con vista previa
                  </span>
                  <button
                    type="button"
                    onClick={copyText}
                    className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-bold text-accent transition-colors hover:bg-accent/10"
                  >
                    {feedback === "text" ? <Check size={11} /> : <Copy size={11} />}
                    {feedback === "text" ? "Copiado" : "Copiar texto"}
                  </button>
                </div>

                {/* WhatsApp mockup */}
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[9px] font-black">
                      IS
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold leading-tight">Infosistel</p>
                      <p className="text-[8px] text-white/70">en línea</p>
                    </div>
                  </div>
                  <div className="bg-[#e5ddd5] px-3 py-3">
                    <div className="ml-auto max-w-[94%] rounded-lg rounded-tr-none bg-[#dcf8c6] p-2 shadow-sm">
                      <p className="line-clamp-1 text-[10px] font-bold text-[#0b3d2e]">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-[#0b3d2e]">
                        Precio: S/. {price.toFixed(2)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-white/70 p-1.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-200 text-slate-500">
                          <ImageIcon size={12} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[9px] font-bold text-slate-700">
                            {product.name}
                          </span>
                          <span className="block truncate text-[8px] text-slate-500">
                            {productUrl.replace(/^https?:\/\//, "")}
                          </span>
                        </span>
                      </div>
                      <p className="mt-1 text-right text-[8px] text-[#0b3d2e]/60">
                        ahora ✓✓
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    openWa(phone);
                  }}
                  className="space-y-2"
                >
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fg-muted">
                    <Phone size={11} /> Enviar a un número
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-fg-muted">
                        +51
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="900 000 000"
                        className="w-full rounded-xl border border-border bg-bg-alt py-2.5 pl-10 pr-3 font-mono text-xs font-semibold text-fg outline-none placeholder:font-normal placeholder:text-fg-muted focus:border-accent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                    >
                      <Send size={13} /> Enviar
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={() => openWa()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-2 text-[11px] font-bold text-fg-muted transition-colors hover:text-fg"
                >
                  <WhatsAppIcon size={13} /> Elegir cualquier chat de WhatsApp
                </button>
              </div>

              <p className="flex items-start gap-1.5 px-1 text-[10px] font-medium text-fg-muted">
                <Link2 size={12} className="mt-0.5 shrink-0" />
                El enlace abre una ficha pública del producto con su foto y
                precio. Tus clientes no ven el número interno ni el stock.
              </p>
            </div>
          </div>
        </div>

        {/* ── footer ── */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-bg px-5 py-2.5">
          <span className="flex min-w-0 items-center gap-1 text-[10px] font-medium text-fg-muted">
            <Info size={12} className="shrink-0" />
            <span className="truncate">
              La imagen se genera en tu navegador y se descarga en PNG HD.
            </span>
          </span>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl border border-border bg-bg-alt px-4 py-1.5 text-xs font-bold text-fg-muted transition-colors hover:text-fg"
          >
            Listo
          </button>
        </div>

        {/* feedback toast */}
        {feedbackMessage && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2">
            <span className="inline-flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-xs font-bold text-bg shadow-xl">
              {feedback === "error" ? <Info size={14} /> : <Check size={14} />}
              {feedbackMessage}
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          HIDDEN FLYER TEMPLATE — rendered offscreen, captured as PNG
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
        <div
          ref={flyerRef}
          style={{
            width: 1080,
            height: 1080,
            overflow: "hidden",
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            position: "relative",
          }}
        >
          {style === "elite" && <FlyerElite product={product} photo={photo} price={price} />}
          {style === "fresh" && <FlyerFresh product={product} photo={photo} price={price} />}
          {style === "neon" && <FlyerNeon product={product} photo={photo} price={price} />}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   FLYER TEMPLATES — Each is a 1080×1080 div with inline styles for reliability
   ═══════════════════════════════════════════════════════════════════════════ */

interface FlyerProps {
  product: AdminProduct;
  photo: string | null;
  price: number;
}

/* ─── ELITE: dark luxury ─── */
function FlyerElite({ product, photo, price }: FlyerProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: "linear-gradient(160deg, #0a0e1a 0%, #111827 40%, #0f172a 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* decorative accent circles */}
      <div style={{ position: "absolute", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)" }} />

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px 50px 0" }}>
        <img src="/brand/infosistel-logo-v3.png" alt="Infosistel" style={{ height: 42, objectFit: "contain" }} crossOrigin="anonymous" />
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 24, padding: "8px 20px", fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em", border: "1px solid rgba(255,255,255,0.1)" }}>
          COMPRA POR WHATSAPP
        </div>
      </div>

      {/* main photo area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 50px" }}>
        <div style={{
          width: 580,
          height: 520,
          borderRadius: 32,
          background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        }}>
          {photo ? (
            <img
              src={photo}
              alt={product.name}
              crossOrigin="anonymous"
              style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain" }}
            />
          ) : (
            <div style={{ fontSize: 80, opacity: 0.15 }}>📦</div>
          )}
        </div>

        {/* price block on the right */}
        <div style={{ marginLeft: 40, display: "flex", flexDirection: "column", gap: 16, maxWidth: 380 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            {product.category}
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#ffffff", lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {product.name}
          </div>
          <div>
            <div style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              borderRadius: 20,
              padding: "16px 32px",
              boxShadow: "0 8px 30px rgba(16,185,129,0.3)",
            }}>
              <span style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
                S/. {price.toFixed(2)}
              </span>
            </div>
            {product.onSale && product.salePrice && (
              <div style={{ marginTop: 8, fontSize: 20, color: "rgba(255,255,255,0.35)", textDecoration: "line-through", fontWeight: 700 }}>
                Antes: S/. {product.price.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 50px 40px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: 28,
        marginLeft: 50,
        marginRight: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Huancayo · Tienda Infosistel</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#25d366", borderRadius: 20, padding: "12px 24px", boxShadow: "0 6px 20px rgba(37,211,102,0.3)" }}>
          <span style={{ fontSize: 20 }}>📲</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>+51 900 000 000</span>
        </div>
      </div>
    </div>
  );
}

/* ─── FRESH: clean white / light ─── */
function FlyerFresh({ product, photo, price }: FlyerProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* decorative blobs */}
      <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -150, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)" }} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px 50px 0" }}>
        <img src="/brand/infosistel-logo-v3.png" alt="Infosistel" style={{ height: 38, objectFit: "contain" }} crossOrigin="anonymous" />
        <div style={{ background: "#0f172a", borderRadius: 24, padding: "8px 20px", fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "0.08em" }}>
          COMPRA POR WHATSAPP
        </div>
      </div>

      {/* category pill */}
      <div style={{ padding: "24px 50px 0" }}>
        <span style={{ display: "inline-block", background: "#0284c7", color: "#fff", borderRadius: 20, padding: "6px 18px", fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {product.category}
        </span>
      </div>

      {/* content: left text + right photo */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "20px 50px", gap: 40 }}>

        {/* left */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#0f172a", lineHeight: 1.15, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {product.name}
          </div>

          {product.description && (
            <div style={{ fontSize: 18, color: "#64748b", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {product.description}
            </div>
          )}

          {/* price */}
          <div>
            <div style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              borderRadius: 24,
              padding: "20px 36px",
              boxShadow: "0 10px 40px rgba(15,23,42,0.15)",
            }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
                S/. {price.toFixed(2)}
              </span>
            </div>
            {product.onSale && product.salePrice && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22, color: "#94a3b8", textDecoration: "line-through", fontWeight: 700 }}>S/. {product.price.toFixed(2)}</span>
                <span style={{ background: "#fbbf24", color: "#0f172a", borderRadius: 16, padding: "4px 14px", fontSize: 14, fontWeight: 900 }}>¡OFERTA!</span>
              </div>
            )}
          </div>
        </div>

        {/* right photo */}
        <div style={{
          width: 440,
          height: 520,
          borderRadius: 36,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.08), 0 5px 15px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}>
          {photo ? (
            <img src={photo} alt="" crossOrigin="anonymous" style={{ maxWidth: "85%", maxHeight: "85%", objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 72, opacity: 0.1 }}>📦</div>
          )}
        </div>
      </div>

      {/* bottom bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 50px 36px",
        borderTop: "2px solid rgba(0,0,0,0.06)",
        margin: "0 50px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 700, color: "#64748b" }}>
          <span>📍</span> Huancayo · Tienda Infosistel
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#25d366",
          borderRadius: 24,
          padding: "14px 28px",
          boxShadow: "0 6px 24px rgba(37,211,102,0.25)",
        }}>
          <span style={{ fontSize: 18 }}>📲</span>
          <span style={{ fontSize: 19, fontWeight: 900, color: "#fff" }}>+51 900 000 000</span>
        </div>
      </div>
    </div>
  );
}

/* ─── NEON: cyberpunk / gaming ─── */
function FlyerNeon({ product, photo, price }: FlyerProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: "linear-gradient(170deg, #030712 0%, #0a0f23 30%, #0c1025 60%, #07050d 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* neon accent glows */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4)" }} />
      <div style={{ position: "absolute", top: -200, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 60%)" }} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px 50px 0" }}>
        <img src="/brand/infosistel-logo-v3.png" alt="Infosistel" style={{ height: 40, objectFit: "contain" }} crossOrigin="anonymous" />
        <div style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: 24,
          padding: "8px 20px",
          fontSize: 15,
          fontWeight: 800,
          color: "#c4b5fd",
          letterSpacing: "0.08em",
        }}>
          COMPRA POR WHATSAPP
        </div>
      </div>

      {/* center photo */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 50px" }}>
        <div style={{
          width: 520,
          height: 500,
          borderRadius: 36,
          background: "linear-gradient(145deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))",
          border: "1px solid rgba(139,92,246,0.2)",
          boxShadow: "0 0 60px rgba(139,92,246,0.1), 0 0 120px rgba(6,182,212,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}>
          {photo ? (
            <img src={photo} alt="" crossOrigin="anonymous" style={{ maxWidth: "85%", maxHeight: "85%", objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 72, opacity: 0.15 }}>📦</div>
          )}
        </div>

        {/* right info */}
        <div style={{ marginLeft: 40, display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 900,
            background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}>
            {product.category}
          </div>

          <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {product.name}
          </div>

          {/* price */}
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            borderRadius: 24,
            padding: "18px 32px",
            boxShadow: "0 8px 40px rgba(124,58,237,0.3)",
            alignSelf: "flex-start",
          }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
              S/. {price.toFixed(2)}
            </span>
          </div>
          {product.onSale && product.salePrice && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, color: "rgba(255,255,255,0.3)", textDecoration: "line-through", fontWeight: 700 }}>S/. {product.price.toFixed(2)}</span>
              <span style={{ background: "linear-gradient(90deg, #f59e0b, #f97316)", color: "#fff", borderRadius: 14, padding: "4px 14px", fontSize: 14, fontWeight: 900 }}>OFERTA</span>
            </div>
          )}
        </div>
      </div>

      {/* bottom bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 50px 36px",
        borderTop: "1px solid rgba(139,92,246,0.15)",
        paddingTop: 24,
        marginLeft: 50,
        marginRight: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
          📍 Huancayo · Tienda Infosistel
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "linear-gradient(135deg, #25d366, #128c7e)",
          borderRadius: 24,
          padding: "14px 28px",
          boxShadow: "0 6px 24px rgba(37,211,102,0.3)",
        }}>
          <span style={{ fontSize: 18 }}>📲</span>
          <span style={{ fontSize: 19, fontWeight: 900, color: "#fff" }}>+51 900 000 000</span>
        </div>
      </div>
    </div>
  );
}
