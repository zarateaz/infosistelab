"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  MessageCircle,
  X,
  ArrowUp,
  Camera,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Plus,
  Minus,
  Package,
  ShoppingBag,
  Search,
  CheckCircle2,
} from "lucide-react";
import { CameraScanner } from "@/app/taller-control/(panel)/productos/CameraScanner";

export function AdminChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const transport = new DefaultChatTransport({
    api: "/api/admin-chat",
  });

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isBusy, error]);

  // Captura global de imágenes al presionar Ctrl+V con el chatbot abierto
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const namedFile = new File([file], `captura_${Date.now()}.png`, { type: file.type });
            setSelectedImage(namedFile);
            setImagePreviewUrl(URL.createObjectURL(namedFile));
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [isOpen]);

  const onBarcodeDetected = (code: string) => {
    setShowScanner(false);
    sendMessage({ text: `Registra la venta del producto con código de barras: ${code}` });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !selectedImage) || isBusy) return;

    if (selectedImage) {
      const dt = new DataTransfer();
      dt.items.add(selectedImage);
      sendMessage({
        text: input.trim() || "Analiza esta captura de pantalla y gestiona el stock del producto identificado.",
        files: dt.files,
      });
      removeImage();
    } else {
      sendMessage({ text: input });
    }

    setInput("");
  };

  const handleQuickPrompt = (promptText: string) => {
    if (isBusy) return;
    sendMessage({ text: promptText });
  };

  return (
    <>
      {/* Botón flotante blanco puro con esquinas redondeadas */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-600 border border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.12)] transition-all hover:scale-105 hover:border-blue-400 hover:shadow-[0_14px_45px_rgba(10,95,219,0.2)] active:scale-95 group"
        title="Asistente de Inventario Infosistel"
      >
        {isOpen ? (
          <X size={22} className="text-slate-600 group-hover:text-slate-900 transition-colors" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Sparkles size={24} className="text-blue-600 transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white"></span>
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="fixed bottom-24 right-6 z-[100] flex h-[600px] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.16),0_10px_25px_rgba(0,0,0,0.06)] ring-1 ring-slate-100"
        >
          {/* Overlay al arrastrar imagen */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-600/10 backdrop-blur-xs border-2 border-dashed border-blue-500 rounded-3xl p-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-white shadow-lg flex items-center justify-center text-blue-600 mb-3 animate-bounce">
                <ImageIcon size={28} />
              </div>
              <p className="text-slate-800 font-bold text-sm">Suelta tu captura de pantalla aquí</p>
              <p className="text-slate-500 text-xs mt-1">El asistente analizará el producto y actualizará el inventario</p>
            </div>
          )}

          {/* Encabezado blanco puro con esquinas redondeadas */}
          <div className="flex shrink-0 items-center justify-between bg-white px-5 py-3.5 border-b border-slate-100 relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-sm tracking-tight">Inventario AI</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                </div>
                <p className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">Infosistel Copilot • En línea</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Reiniciar chat y ver tutorial"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Área de mensajes con fondo blanco luminoso */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3.5 bg-slate-50/40 text-sm relative">
            {/* Tutorial interactivo al abrir cuando no hay mensajes */}
            {messages.length === 0 && (
              <div className="flex flex-col space-y-3 pt-1 pb-2">
                {/* Cabecera del tutorial */}
                <div className="text-center py-2 px-2">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-2 border border-blue-100 shadow-2xs">
                    <Sparkles size={22} className="text-blue-600" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-sm tracking-tight">
                    ¿Qué puedo hacer por ti hoy?
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed max-w-[300px] mx-auto">
                    Gestiona tu stock en tiempo real mediante números, nombres o capturas de pantalla.
                  </p>
                </div>

                {/* Pasos / Capacidades explicadas */}
                <div className="space-y-2">
                  {/* Tarjeta 1: Por número */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs">
                        #
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800">Por número (#) o ID</h4>
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                            Directo
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Indica el número (#) para sumar o restar unidades al instante.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickPrompt("Agrega 5 de stock al #14")}
                            className="rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-blue-700 transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <Plus size={11} className="text-emerald-600" /> Agrega 5 al #14
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickPrompt("Quita 1 de stock al #14")}
                            className="rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-rose-700 transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <Minus size={11} className="text-rose-600" /> Quita 1 al #14
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta 2: Por nombre */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs">
                        🏷️
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800">Por nombre de producto</h4>
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                            Búsqueda
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Escribe el nombre o marca y se resolverá automáticamente.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickPrompt("Suma 3 unidades a Kingston NV2")}
                            className="rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-indigo-700 transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <Package size={11} className="text-indigo-600" /> +3 Kingston NV2
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickPrompt("Vendí 1 Mouse Logitech")}
                            className="rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-indigo-700 transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <ShoppingBag size={11} className="text-indigo-600" /> Vendí 1 Logitech
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta 3: Por capturas de pantalla */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs">
                        📸
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800">Capturas de pantalla (Ctrl+V)</h4>
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            Visión IA
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Presiona <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-800">Ctrl + V</kbd> para pegar capturas de facturas, pedidos de WhatsApp o fotos de cajas.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consulta rápida de catálogo */}
                <div className="pt-1 flex items-center justify-between px-1">
                  <span className="text-[11px] text-slate-400 font-medium">¿Quieres consultar stock?</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPrompt("¿Cuáles son los productos con bajo stock o por agotarse?")}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    Ver stock bajo &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Mensajes de la conversación */}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} relative z-10`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed text-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white font-medium rounded-br-xs shadow-sm shadow-blue-500/20"
                      : "bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs shadow-2xs"
                  }`}
                >
                  {m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
                    }
                    if (part.type === "file" && part.mediaType?.startsWith("image/")) {
                      return (
                        <div key={i} className="mb-2">
                          <img
                            src={part.url}
                            alt="Captura adjunta"
                            className="rounded-xl max-w-full max-h-[220px] object-cover border border-slate-200 shadow-2xs"
                          />
                        </div>
                      );
                    }
                    if (
                      part.type === "tool-buscarProductoAdmin" ||
                      part.type === "tool-registrarVentaAdmin" ||
                      part.type === "tool-ajustarStockAdmin" ||
                      part.type === "tool-quitarStockAdmin"
                    ) {
                      if (part.state === "output-available") {
                        if (part.type === "tool-ajustarStockAdmin") {
                          return (
                            <div key={i} className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-2xs">
                              <Plus size={14} className="text-emerald-600 shrink-0" />
                              <span>Stock ingresado correctamente</span>
                            </div>
                          );
                        }
                        if (part.type === "tool-quitarStockAdmin") {
                          return (
                            <div key={i} className="mt-2 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200/80 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-2xs">
                              <Minus size={14} className="text-rose-600 shrink-0" />
                              <span>Stock descontado del inventario</span>
                            </div>
                          );
                        }
                        if (part.type === "tool-registrarVentaAdmin") {
                          return (
                            <div key={i} className="mt-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200/80 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-2xs">
                              <ShoppingBag size={14} className="text-blue-600 shrink-0" />
                              <span>Venta registrada y stock descontado</span>
                            </div>
                          );
                        }
                        return (
                          <div key={i} className="mt-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-2xs">
                            <Search size={14} className="text-slate-500 shrink-0" />
                            <span>Búsqueda de producto completada</span>
                          </div>
                        );
                      } else {
                        return (
                          <div key={i} className="mt-2 text-xs font-medium text-blue-600 bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1 flex items-center gap-1.5 animate-pulse">
                            <Sparkles size={13} className="shrink-0" />
                            <span>Procesando inventario...</span>
                          </div>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}

            {isBusy ? (
              <div className="flex items-center gap-2 text-blue-600 font-medium text-xs p-2">
                <Sparkles size={14} className="animate-spin" />
                <span className="animate-pulse">Actualizando inventario en tiempo real...</span>
              </div>
            ) : null}

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3">
                Error: {error.message || "Algo salió mal al procesar la solicitud"}
              </div>
            )}
          </div>

          {/* Formulario de entrada blanco puro con esquinas redondeadas */}
          <form onSubmit={handleSubmit} className="flex flex-col border-t border-slate-100 bg-white p-3 gap-2 relative z-10">
            {/* Preview de la captura de pantalla o imagen seleccionada */}
            {imagePreviewUrl && (
              <div className="relative flex items-center gap-3 p-2 rounded-2xl border border-blue-200 bg-blue-50/60">
                <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                  <img src={imagePreviewUrl} alt="Captura adjunta" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase bg-blue-100 px-1.5 py-0.5 rounded-md">
                      Captura adjunta
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {selectedImage?.size ? `${(selectedImage.size / 1024).toFixed(0)} KB` : ""}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                    {selectedImage?.name || "captura.png"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-600 transition-colors shadow-2xs"
                  title="Eliminar captura"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/90 transition-all shadow-2xs"
                title="Subir captura o foto (Ctrl+V para pegar directo)"
              >
                <ImageIcon size={18} />
              </button>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/90 transition-all shadow-2xs"
                title="Escanear Código de Barras con Cámara"
              >
                <Camera size={18} />
              </button>
              <input
                ref={textInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ej: Agrega 5 al #14, o pega captura..."
                disabled={isBusy}
                className="flex-1 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isBusy}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm shadow-blue-500/25"
                title="Enviar mensaje"
              >
                <ArrowUp size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span>💡 Presiona <kbd className="font-mono text-[9px] bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">Ctrl + V</kbd> para pegar capturas de pantalla</span>
            </div>
          </form>
        </div>
      )}

      {showScanner && (
        <CameraScanner onDetected={onBarcodeDetected} onClose={() => setShowScanner(false)} />
      )}
    </>
  );
}
