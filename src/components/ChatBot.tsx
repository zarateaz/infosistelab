"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, X, ArrowUp, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/components/tienda/categoryIcons";

// The chat bubble renders plain text (no markdown parser, by design — no
// new dependency for a handful of short messages). The system prompt asks
// the model to avoid markdown, but a user can explicitly ask for "bold"
// and the model will still reach for **asterisks** anyway — this strips
// the common tokens as a second layer so raw syntax never leaks through.
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ");
}

// Mirrors the shape buscarProductos (src/lib/chatTools.ts) returns — kept
// separate from that file's inline return type since this is the client
// bundle, not server code.
interface ProductoResultado {
  nombre: string;
  categoria: string;
  precio: string;
  precioRegular: string | null;
  disponible: boolean;
  stock: number;
  imagen: string | null;
}

/** Real catalog photos for whatever buscarProductos just found, rendered
 *  as a horizontally-scrollable row next to the assistant's text — this is
 *  what lets "compara esta impresora con esa otra" actually show both
 *  side by side instead of the model just describing them in prose. Same
 *  photo (or category icon placeholder) the storefront itself uses, so a
 *  product looks the same in chat as it does on /tienda. */
function ProductResults({ productos }: { productos: ProductoResultado[] }) {
  if (productos.length === 0) return null;
  return (
    <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
      {productos.map((p, i) => (
        <div
          key={i}
          className="w-[124px] shrink-0 overflow-hidden rounded-xl border border-border bg-bg-alt"
        >
          <div className="flex h-[88px] w-full items-center justify-center bg-bg">
            {p.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imagen} alt={p.nombre} className="h-full w-full object-contain p-2" />
            ) : (
              <CategoryIcon category={p.categoria} size={26} strokeWidth={1.25} className="text-fg-muted opacity-40" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 p-2">
            <span className="truncate text-[8px] font-black uppercase tracking-wider text-fg-muted">
              {p.categoria}
            </span>
            <span className="line-clamp-2 text-[11px] font-bold leading-tight text-fg">{p.nombre}</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xs font-black text-accent">{p.precio}</span>
              {p.precioRegular && (
                <span className="text-[9px] text-fg-muted line-through">{p.precioRegular}</span>
              )}
            </div>
            <span className={`text-[9px] font-bold ${p.disponible ? "text-emerald-500" : "text-red-400"}`}>
              {p.disponible ? "En stock" : "Agotado"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Mirrors MAX_MESSAGE_CHARS in src/app/api/chat/route.ts — keeps the
// paste-a-huge-block-of-text case from ever leaving the browser instead of
// round-tripping to get rejected server-side.
const MAX_MESSAGE_CHARS = 500;

// No hay login de cliente en la tienda, así que "cliente frecuente" se
// resuelve por navegador, no por cuenta — este par de claves en
// localStorage es toda la "memoria" del chatbot sobre un visitante.
const LS_RETURNING_KEY = "infosistel_chat_returning";
const LS_CATEGORIES_KEY = "infosistel_chat_categories";
const MAX_REMEMBERED_CATEGORIES = 5;

interface VisitorMemory {
  returning: boolean;
  recentCategories: string[];
}

function readRecentCategories(): string[] {
  try {
    const raw = localStorage.getItem(LS_CATEGORIES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    // Modo privado u otro bloqueo de localStorage — se pierde la
    // personalización, nunca la función del chat.
    return [];
  }
}

function loadVisitorMemory(): VisitorMemory {
  try {
    return { returning: localStorage.getItem(LS_RETURNING_KEY) === "1", recentCategories: readRecentCategories() };
  } catch {
    return { returning: false, recentCategories: [] };
  }
}

// Mezcla las categorías vistas en esta conversación con las de visitas
// pasadas — más recientes primero, sin duplicados, capado a un puñado para
// no acumular para siempre.
function rememberCategories(seen: string[]) {
  if (seen.length === 0) return;
  try {
    const merged = [...seen, ...readRecentCategories()]
      .filter((c, i, arr) => arr.indexOf(c) === i)
      .slice(0, MAX_REMEMBERED_CATEGORIES);
    localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(merged));
  } catch {
    // ídem — no crítico.
  }
}

function getTimeGreeting(): string {
  if (typeof window === "undefined") return "¡Hola!";
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "¡Buenos días! ☀️";
  if (hour >= 12 && hour < 19) return "¡Buenas tardes! 🌤️";
  return "¡Buenas noches! 🌙";
}

// Mensaje sembrado en el cliente con saludo según la hora del día en Huancayo/Perú
function buildGreeting(visitor: VisitorMemory): UIMessage {
  const timeGreeting = getTimeGreeting();
  const lastCategory = visitor.recentCategories[0];
  const text = visitor.returning && lastCategory
    ? `${timeGreeting} Qué gusto saludarte. Bienvenido nuevamente a INFOSISTEL. 👋 ¿Deseas seguir revisando opciones de ${lastCategory.toLowerCase()} o necesitas asesoría con algún otro equipo o servicio técnico? Estoy a tu entera disposición.`
    : `${timeGreeting} Te doy una cordial bienvenida a INFOSISTEL. 👋 Estamos listos para ayudarte con lo mejor en tecnología, repuestos y servicio técnico garantizado en Huancayo. ¿Buscas algún producto del catálogo o necesitas ayuda con una reparación? Cuéntame y te oriento al instante.`;
  return { id: "infosistel-welcome", role: "assistant", parts: [{ type: "text", text }] };
}

const QUICK_REPLIES = [
  { label: "Laptops y PCs", text: "Quiero ver laptops y PCs" },
  { label: "Impresoras", text: "Quiero ver impresoras" },
  { label: "Redes y Wi-Fi", text: "Necesito algo de redes o Wi-Fi" },
  { label: "Reparar un equipo", text: "Tengo un equipo para reparar" },
];

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  // Se lee una sola vez al montar — el "returning" y las categorías que ve
  // ESTE saludo son el estado de ANTES de esta visita
  const [visitor] = useState<VisitorMemory>(() => loadVisitorMemory());
  const [showPulse, setShowPulse] = useState(() => visitor.returning);
  const [initialMessages] = useState<UIMessage[]>(() => [buildGreeting(visitor)]);
  const [isAutoDismissing, setIsAutoDismissing] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const hasInteractedRef = useRef(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const transport = new DefaultChatTransport({
    api: "/api/chat",
    body: { visitorContext: { returning: visitor.returning, recentCategories: readRecentCategories() } },
  });

  const { messages, sendMessage, status, error } = useChat({ messages: initialMessages, transport });
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isBusy, error]);

  // Cancela el cierre automático si el usuario interactúa (toca, pasa mouse, hace focus o escribe)
  const cancelAutoDismiss = () => {
    hasInteractedRef.current = true;
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setIsAutoDismissing(false);
  };

  // Saludo inteligente y no invasivo: en vez de abrir un modal gigante que bloquea la pantalla,
  // mostramos un toast flotante elegante a los 2.5s que no oscurece la pantalla ni bloquea el scroll
  useEffect(() => {
    try {
      localStorage.setItem(LS_RETURNING_KEY, "1");
    } catch {
      // no crítico
    }

    const toastTimer = setTimeout(() => {
      if (!hasInteractedRef.current && !isOpen) {
        setShowToast(true);
      }
    }, 2200);

    return () => {
      clearTimeout(toastTimer);
    };
  }, [isOpen]);

  // "Aprende" qué categorías le interesan a este visitante a partir de lo
  // que buscarProductos/productosPopulares ya le mostró en esta conversación
  useEffect(() => {
    const seen = new Set<string>();
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          (part.type === "tool-buscarProductos" || part.type === "tool-productosPopulares") &&
          part.state === "output-available"
        ) {
          const productos = (part.output as { productos?: ProductoResultado[] } | undefined)?.productos;
          productos?.forEach((p) => seen.add(p.categoria));
        }
      }
    }
    if (seen.size > 0) rememberCategories(Array.from(seen));
  }, [messages]);

  const handleToggle = () => {
    cancelAutoDismiss();
    setShowToast(false);
    setIsOpen((v) => !v);
  };

  const handleClose = () => {
    cancelAutoDismiss();
    setShowToast(false);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cancelAutoDismiss();
    setShowToast(false);
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleQuickReply = (text: string) => {
    cancelAutoDismiss();
    setShowToast(false);
    if (isBusy) return;
    sendMessage({ text });
  };

  return (
    <>
      {/* Botón Flotante Launcher del Asistente */}
      <button
        type="button"
        onClick={handleToggle}
        className={`fixed right-4 sm:right-6 z-40 sm:z-50 h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-[0_8px_30px_rgba(79,70,229,0.35)] transition-all hover:scale-105 active:scale-95 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] ${
          isOpen ? "hidden sm:flex" : "flex"
        }`}
        aria-label="Abrir asistente"
      >
        {showPulse && !isOpen && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-blue-500/60" />
        )}
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Toast discreto de invitación (Speech bubble a la izquierda del botón) */}
      {showToast && !isOpen && (
        <div
          onClick={() => {
            setShowToast(false);
            cancelAutoDismiss();
            setIsOpen(true);
          }}
          className="fixed right-18 sm:right-22 z-40 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-bold text-gray-800 shadow-[0_8px_25px_rgba(0,0,0,0.12)] border border-blue-100 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all max-w-[240px] sm:max-w-[280px] bottom-[calc(1.15rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.65rem+env(safe-area-inset-bottom))] animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate">👋 ¿En qué te ayudo? Chatea aquí</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowToast(false);
            }}
            className="text-gray-400 hover:text-gray-600 p-0.5 ml-auto"
            aria-label="Cerrar aviso"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Overlay oscuro para dispositivos móviles (Android / iOS) */}
      {isOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity sm:hidden"
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <div
          onMouseEnter={cancelAutoDismiss}
          onTouchStart={cancelAutoDismiss}
          onClick={cancelAutoDismiss}
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          className="fixed z-50 flex flex-col overflow-hidden bg-white/95 backdrop-blur-xl shadow-2xl transition-all duration-300 inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[28px] border-t border-blue-100 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:inset-y-auto sm:bottom-24 sm:right-6 sm:h-[70dvh] sm:max-h-[560px] sm:w-96 sm:rounded-3xl sm:border sm:border-blue-100 sm:shadow-[0_20px_60px_-15px_rgba(37,99,235,0.25)] ring-1 ring-black/5"
        >
          {/* Manija táctil para Android */}
          <div className="flex w-full items-center justify-center pt-2.5 pb-1 sm:hidden">
            <div className="h-1.5 w-12 rounded-full bg-gray-300" />
          </div>

          {/* Cabecera del Chatbot con indicador de estado en vivo */}
          <div className="flex shrink-0 items-center gap-3 bg-white px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-inner">
              <Sparkles size={18} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm sm:text-base font-extrabold tracking-tight text-gray-900 truncate">
                  Asistente Infosistel
                </p>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-200">
                  En línea
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-gray-500">Respuestas en segundos</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 active:scale-90"
              aria-label="Cerrar asistente"
            >
              <X size={20} />
            </button>
          </div>

          {/* Barra sutil de progreso cuando está por auto-desaparecer en 3s */}
          {isAutoDismissing && (
            <div className="relative h-1 w-full bg-blue-50 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-accent animate-dismiss-bar" />
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 bg-slate-50/50">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20"
                      : "rounded-bl-md bg-white border border-gray-100 text-gray-700"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <span key={i}>
                          {message.role === "assistant" ? stripMarkdown(part.text) : part.text}
                        </span>
                      );
                    }
                    if (
                      (part.type === "tool-buscarProductos" || part.type === "tool-productosPopulares") &&
                      part.state === "output-available"
                    ) {
                      const productos = (part.output as { productos?: ProductoResultado[] } | undefined)
                        ?.productos;
                      return productos ? <ProductResults key={i} productos={productos} /> : null;
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}

            {/* Chips de respuesta rápida bajo el saludo inicial — llevan a
                que el cliente navegue el catálogo con un toque, en vez de
                tener que escribir. Desaparecen apenas empieza la
                conversación real. */}
            {messages.length === 1 && !isBusy && (
              <div className="flex flex-wrap gap-2 pl-1">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr.label}
                    onClick={() => handleQuickReply(qr.text)}
                    className="rounded-full border border-gray-200 bg-white shadow-sm px-4 py-2 text-xs font-bold text-gray-600 transition-all hover:border-blue-500 hover:text-blue-600 hover:shadow"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {isBusy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white border border-gray-100 shadow-sm px-5 py-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-red-500/10 px-4 py-2.5 text-sm leading-relaxed text-red-400">
                  {/* Server-specific message when the AI SDK's onError supplied one
                      (invalid key, sin saldo, etc.) — generic fallback otherwise. */}
                  {error?.message || "No pude responder en este momento."} Intenta de nuevo o
                  escríbenos por{" "}
                  <a
                    href="https://wa.me/51900000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                  >
                    WhatsApp
                  </a>
                  .
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 items-center gap-2 sm:gap-3 border-t border-gray-100 bg-white/95 p-3 sm:p-4 backdrop-blur-md"
          >
            <input
              value={input}
              onChange={(e) => {
                cancelAutoDismiss();
                setInput(e.target.value);
              }}
              onFocus={cancelAutoDismiss}
              placeholder="Escribe tu pregunta..."
              disabled={isBusy}
              maxLength={MAX_MESSAGE_CHARS}
              className="flex-1 rounded-2xl bg-gray-100 border border-transparent px-4 py-2.5 sm:py-3 text-base text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isBusy || !input.trim()}
              aria-label="Enviar pregunta"
              className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
