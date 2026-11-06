"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Download,
  MessageCircle,
  Eye,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { StatCard } from "../StatCard";
import { ConfirmDialog } from "../ConfirmDialog";
import type { QuotationRecord } from "./actions";
import { CotizacionFormModal } from "./CotizacionFormModal";
import { CotizacionDetailModal } from "./CotizacionDetailModal";
import { generateQuotationPDF } from "@/lib/quotationPdfGenerator";
import { formatQuotationDate } from "@/lib/quotationDates";
import { buildWhatsAppQuotationLink, deleteQuotation, updateQuotationStatus } from "./actions";

interface CotizacionesClientProps {
  initialQuotations: QuotationRecord[];
}

export function CotizacionesClient({ initialQuotations }: CotizacionesClientProps) {
  const [quotations, setQuotations] = useState<QuotationRecord[]>(initialQuotations);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("TODAS");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<QuotationRecord | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<QuotationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter quotations
  const filteredQuotations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return quotations.filter((item) => {
      const matchesStatus =
        selectedStatus === "TODAS" || item.status === selectedStatus;
      const matchesQuery =
        !q ||
        item.code.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        (item.clientDocNum || "").toLowerCase().includes(q) ||
        (item.clientPhone || "").toLowerCase().includes(q) ||
        item.items.some((it) => it.description.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [quotations, searchQuery, selectedStatus]);

  // Metrics
  const metrics = useMemo(() => {
    const total = quotations.length;
    const pending = quotations.filter((q) => q.status === "PENDIENTE" || q.status === "ENVIADA").length;
    const approved = quotations.filter((q) => q.status === "APROBADA" || q.status === "FACTURADA").length;
    const totalQuotedAmount = quotations
      .filter((q) => q.status !== "RECHAZADA")
      .reduce((sum, q) => sum + (q.currency === "USD" ? q.total * 3.75 : q.total), 0);

    return { total, pending, approved, totalQuotedAmount };
  }, [quotations]);

  const handleDownloadPDF = (q: QuotationRecord) => {
    let pdfImages: string[] = [];
    if (q.images) {
      try {
        const parsed = JSON.parse(q.images);
        if (Array.isArray(parsed)) pdfImages = parsed;
      } catch {
        pdfImages = [];
      }
    }

    generateQuotationPDF({
      code: q.code,
      clientName: q.clientName,
      clientDocType: q.clientDocType,
      clientDocNum: q.clientDocNum,
      clientPhone: q.clientPhone,
      clientEmail: q.clientEmail,
      clientAddress: q.clientAddress,
      attentionTo: q.attentionTo,
      issueDate: q.issueDate,
      validDays: q.validDays,
      currency: q.currency,
      includeIgv: q.includeIgv,
      subtotal: q.subtotal,
      discount: q.discount,
      igv: q.igv,
      total: q.total,
      deliveryTime: q.deliveryTime,
      paymentMethod: q.paymentMethod,
      warranty: q.warranty,
      notes: q.notes,
      items: q.items,
      images: pdfImages,
    });
  };

  const handleWhatsApp = async (q: QuotationRecord) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.infosistel.com.pe";
    const link = await buildWhatsAppQuotationLink(q, origin);
    window.open(link, "_blank");
  };

  const handleConfirmDelete = async () => {
    if (!quotationToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteQuotation(quotationToDelete.id);
      if (res.success) {
        setQuotations((prev) => prev.filter((it) => it.id !== quotationToDelete.id));
        if (selectedQuotation?.id === quotationToDelete.id) {
          setIsDetailOpen(false);
        }
        setQuotationToDelete(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: any) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q))
    );
    if (selectedQuotation && selectedQuotation.id === id) {
      setSelectedQuotation({ ...selectedQuotation, status: newStatus });
    }
  };

  const handleSavedQuotation = (saved: QuotationRecord) => {
    setQuotations((prev) => {
      const idx = prev.findIndex((it) => it.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDIENTE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            <Clock size={11} /> Pendiente
          </span>
        );
      case "ENVIADA":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
            <Share2 size={11} /> Enviada
          </span>
        );
      case "APROBADA":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={11} /> Aprobada
          </span>
        );
      case "RECHAZADA":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
            <XCircle size={11} /> Rechazada
          </span>
        );
      case "FACTURADA":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
            <Receipt size={11} /> Facturada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-bold text-fg-muted">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <Link href="/taller-control/ventas" className="hover:underline">
              Ventas
            </Link>
            <span>/</span>
            <span className="text-fg-muted">Cotizaciones</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Cotizaciones Comerciales
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Generador de propuestas y proformas con el logo oficial de Infosistel, exportación en PDF y seguimiento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingQuotation(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-accent-fg shadow-md shadow-accent/25 transition-all hover:opacity-90 active:scale-95"
        >
          <Plus size={16} />
          <span>Nueva Cotización</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total Cotizaciones"
          value={metrics.total.toString()}
          tint="cyan"
        />
        <StatCard
          icon={Clock}
          label="Pendientes / Enviadas"
          value={metrics.pending.toString()}
          tint="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Aprobadas / Facturadas"
          value={metrics.approved.toString()}
          tint="emerald"
        />
        <StatCard
          icon={Receipt}
          label="Volumen Cotizado"
          value={`S/. ${metrics.totalQuotedAmount.toFixed(2)}`}
          tint="violet"
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="admin-glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            placeholder="Buscar por código (COT-...), cliente, RUC/DNI o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-field w-full rounded-xl pl-9 pr-4 py-2 text-xs text-fg"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {["TODAS", "PENDIENTE", "ENVIADA", "APROBADA", "FACTURADA", "RECHAZADA"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                selectedStatus === st
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "border border-border bg-bg-alt text-fg-muted hover:text-fg"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="overflow-x-auto admin-glass rounded-[var(--radius-lg)]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="admin-thead text-xs font-bold uppercase tracking-wider text-fg-muted">
              <th className="px-5 py-3.5">Código / Fecha</th>
              <th className="px-5 py-3.5">Cliente</th>
              <th className="px-5 py-3.5">Ítems</th>
              <th className="px-5 py-3.5 text-right">Monto Total</th>
              <th className="px-5 py-3.5 text-center">Estado</th>
              <th className="px-5 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredQuotations.map((q) => {
              const curr = q.currency === "USD" ? "$" : "S/.";
              return (
                <tr key={q.id} className="transition-colors hover:bg-fg/[0.02]">
                  {/* Code & Date */}
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuotation(q);
                        setIsDetailOpen(true);
                      }}
                      className="font-mono text-xs font-bold text-accent hover:underline"
                    >
                      {q.code}
                    </button>
                    <p className="mt-0.5 text-[11px] text-fg-muted">
                      {formatQuotationDate(q.issueDate)} · {q.validDays}d validez
                    </p>
                  </td>

                  {/* Customer */}
                  <td className="px-5 py-4">
                    <p className="font-semibold text-fg">{q.clientName}</p>
                    <p className="text-xs text-fg-muted">
                      {q.clientDocNum ? `${q.clientDocType || "Doc"}: ${q.clientDocNum}` : "Sin documento"}
                      {q.clientPhone ? ` · ${q.clientPhone}` : ""}
                    </p>
                  </td>

                  {/* Items */}
                  <td className="px-5 py-4">
                    <p className="text-xs text-fg line-clamp-1">
                      {q.items.map((it) => `${it.quantity}x ${it.description}`).join(", ")}
                    </p>
                    <p className="text-[10px] text-fg-muted">{q.items.length} ítem(s) cotizado(s)</p>
                  </td>

                  {/* Total */}
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono text-sm font-bold text-fg">
                      {curr} {q.total.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-fg-muted">
                      {q.includeIgv ? "Incluye IGV" : "Neto"}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">{statusBadge(q.status)}</td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(q)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg-alt text-fg-muted transition-colors hover:border-accent hover:text-accent"
                        title="Descargar PDF oficial con logo"
                      >
                        <Download size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWhatsApp(q)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                        title="Enviar cotización por WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuotation(q);
                          setIsDetailOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg-alt text-fg-muted transition-colors hover:border-accent hover:text-accent"
                        title="Ver detalle"
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuotation(q);
                          setIsFormOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg-alt text-fg-muted transition-colors hover:border-accent hover:text-accent"
                        title="Editar cotización"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuotationToDelete(q)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg-alt text-fg-muted transition-colors hover:border-rose-500 hover:text-rose-500"
                        title="Eliminar cotización"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredQuotations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-fg-muted">
                  <FileText size={28} className="mx-auto text-fg-muted/40" />
                  <p className="mt-2 font-semibold text-fg">No se encontraron cotizaciones.</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {searchQuery
                      ? "Prueba cambiando el término de búsqueda o filtro."
                      : "Presiona '+ Nueva Cotización' para crear tu primera propuesta comercial."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <CotizacionFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingQuotation(null);
        }}
        quotationToEdit={editingQuotation}
        onSuccess={handleSavedQuotation}
      />

      {/* Detail Modal */}
      <CotizacionDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedQuotation(null);
        }}
        quotation={selectedQuotation}
        onEdit={(q) => {
          setEditingQuotation(q);
          setIsFormOpen(true);
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Modal de Confirmación para Eliminar (Sustituye a window.confirm) */}
      {quotationToDelete && (
        <ConfirmDialog
          title="Eliminar Cotización Comercial"
          message="¿Estás seguro de que deseas enviar esta cotización a la papelera? Podrás consultarla o restaurarla posteriormente si es necesario."
          fields={[
            { label: "Código", value: quotationToDelete.code },
            { label: "Cliente", value: quotationToDelete.clientName },
            {
              label: "Monto Total",
              value: `${quotationToDelete.currency === "USD" ? "$" : "S/."} ${quotationToDelete.total.toFixed(2)}`,
            },
            { label: "Estado actual", value: quotationToDelete.status },
          ]}
          confirmLabel="Sí, enviar a la papelera"
          pendingLabel="Eliminando..."
          danger={true}
          pending={isDeleting}
          onCancel={() => setQuotationToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
