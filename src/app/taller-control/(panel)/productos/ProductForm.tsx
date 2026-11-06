"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, PlusCircle } from "lucide-react";
import type { ProductFormState, AdminProduct } from "./actions";
import { checkDuplicateProduct } from "./actions";
import { ScannerPanel, type ScanFill } from "./ScannerPanel";
import { ImageUploadField } from "./ImageUploadField";
import { ImageGalleryField } from "./ImageGalleryField";
import { ExistingProductActionCard } from "./ExistingProductActionCard";
import type { DuplicateDetectionResult, ProductSummary } from "@/lib/duplicateDetection";

const initialState: ProductFormState = {};

function parseImagesJson(value?: string | null): string[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : undefined;
  } catch {
    return undefined;
  }
}

const inputClass = "admin-field mt-2 w-full rounded-xl px-4 py-2.5 text-sm text-fg";
const labelClass = "text-xs font-bold uppercase tracking-wider text-fg-muted";

export function ProductForm({
  product,
  categoryNames,
  action,
  showScanner = false,
}: {
  product?: AdminProduct;
  categoryNames: string[];
  action: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  showScanner?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [onSale, setOnSale] = useState(product?.onSale ?? false);
  const [imageUploading, setImageUploading] = useState(false);
  const [scannedImagePath, setScannedImagePath] = useState<string | null>(null);
  const [scannedGalleryImages, setScannedGalleryImages] = useState<string[] | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateDetectionResult | null>(null);
  const [ignoredExistingIds, setIgnoredExistingIds] = useState<Set<string>>(new Set());

  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const costPriceRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performDuplicateCheck = async (nameVal?: string, barcodeVal?: string, descVal?: string) => {
    const currentName = nameVal !== undefined ? nameVal : (nameRef.current?.value ?? "");
    const currentBarcode = barcodeVal !== undefined ? barcodeVal : (barcodeRef.current?.value ?? "");
    const currentDesc = descVal !== undefined ? descVal : (descriptionRef.current?.value ?? "");

    if (!currentName.trim() && !currentBarcode.trim()) {
      setDuplicateWarning(null);
      return;
    }

    try {
      const res = await checkDuplicateProduct(currentName, currentBarcode, product?.id, currentDesc);
      if (res.isDuplicate && res.existingProduct && !ignoredExistingIds.has(res.existingProduct.id)) {
        setDuplicateWarning(res);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Best effort check
    }
  };

  const scheduleDuplicateCheck = (nameVal?: string, barcodeVal?: string, descVal?: string) => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(() => {
      performDuplicateCheck(nameVal, barcodeVal, descVal);
    }, 350);
  };

  function applyExistingProductToForm(existing: ProductSummary) {
    if (nameRef.current) nameRef.current.value = existing.name;
    if (existing.category && categoryRef.current) categoryRef.current.value = existing.category;
    if (existing.description && descriptionRef.current) descriptionRef.current.value = existing.description;
    if (barcodeRef.current) barcodeRef.current.value = existing.barcode ?? "";
    if (existing.price !== undefined && priceRef.current) {
      priceRef.current.value = String(existing.price);
    }
    if (costPriceRef.current) {
      costPriceRef.current.value = String(existing.costPrice ?? 0);
    }
    if (stockRef.current) {
      // Default to adding +1 unit to current stock so clicking "Guardar" adds +1 unit
      stockRef.current.value = String((existing.stock ?? 0) + 1);
    }
    if (existing.image) setScannedImagePath(existing.image);
    const extraImgs = parseImagesJson(existing.images);
    if (extraImgs) setScannedGalleryImages(extraImgs);
  }

  function handleScanFill(fill: ScanFill) {
    if (fill.existingProduct) {
      setDuplicateWarning({
        isDuplicate: true,
        reason: "exact_name",
        message: `El producto "${fill.existingProduct.name}" ya se encuentra en la tienda.`,
        existingProduct: fill.existingProduct,
      });
      applyExistingProductToForm(fill.existingProduct);
      return;
    }

    if (fill.existingProduct === null) {
      setDuplicateWarning(null);
    }

    if (fill.name && nameRef.current) nameRef.current.value = fill.name;
    if (fill.description && descriptionRef.current) descriptionRef.current.value = fill.description;
    if (fill.category && categoryRef.current) categoryRef.current.value = fill.category;
    if (fill.barcode !== undefined && barcodeRef.current) barcodeRef.current.value = fill.barcode;
    if (fill.price !== undefined && priceRef.current) {
      priceRef.current.value = String(fill.price);
    }
    if (fill.costPrice !== undefined && costPriceRef.current) {
      costPriceRef.current.value = String(fill.costPrice ?? 0);
    }
    if (fill.stock !== undefined && stockRef.current) {
      stockRef.current.value = String(fill.stock);
    }
    if (fill.image) setScannedImagePath(fill.image);
    if (fill.images) setScannedGalleryImages(fill.images);

    if (fill.existingProduct !== null) {
      performDuplicateCheck(fill.name, fill.barcode, fill.description);
    }
  }

  const matchedProduct = duplicateWarning?.isDuplicate ? duplicateWarning.existingProduct : undefined;

  return (
    <div className="max-w-2xl">
      {showScanner && <ScannerPanel onFill={handleScanFill} />}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="existingProductId" value={matchedProduct?.id ?? ""} />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="name">
              Nombre
            </label>
            <input
              ref={nameRef}
              id="name"
              name="productName"
              defaultValue={product?.name}
              required
              autoComplete="off"
              className={inputClass}
              onChange={(e) => scheduleDuplicateCheck(e.target.value, undefined)}
              onBlur={(e) => performDuplicateCheck(e.target.value, undefined)}
            />
          </div>

          {matchedProduct && !product && (
            <div className="sm:col-span-2">
              <ExistingProductActionCard
                product={matchedProduct}
                onFill={handleScanFill}
                onStockUpdated={(newStock) => {
                  if (stockRef.current) stockRef.current.value = String(newStock);
                }}
                onPlannedStockChange={(plannedTotal) => {
                  if (stockRef.current) stockRef.current.value = String(plannedTotal);
                }}
                onDismissExisting={() => {
                  if (matchedProduct?.id) {
                    setIgnoredExistingIds((prev) => new Set([...prev, matchedProduct.id]));
                  }
                  setDuplicateWarning(null);
                }}
              />
            </div>
          )}

          <div>
            <label className={labelClass} htmlFor="category">
              Categoría
            </label>
            <input
              ref={categoryRef}
              id="category"
              name="category"
              list="category-options"
              defaultValue={product?.category}
              required
              autoComplete="off"
              className={inputClass}
              placeholder="Ej. LAPTOPS"
            />
            <datalist id="category-options">
              {categoryNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={labelClass} htmlFor="stock">
              {matchedProduct && !product ? "Nuevo Stock Total" : "Stock"}
            </label>
            <input
              ref={stockRef}
              id="stock"
              name="stock"
              type="number"
              min={0}
              step={1}
              defaultValue={product?.stock ?? 1}
              required
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="description">
              Descripción
            </label>
            <textarea
              ref={descriptionRef}
              id="description"
              name="description"
              defaultValue={product?.description}
              required
              rows={3}
              className={inputClass}
              onChange={(e) => scheduleDuplicateCheck(undefined, undefined, e.target.value)}
              onBlur={(e) => performDuplicateCheck(undefined, undefined, e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="price">
              Precio (S/.)
            </label>
            <input
              ref={priceRef}
              id="price"
              name="price"
              type="number"
              min={0}
              step={0.01}
              defaultValue={product?.price}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="costPrice">
              Precio de costo (S/.)
            </label>
            <input
              ref={costPriceRef}
              id="costPrice"
              name="costPrice"
              type="number"
              min={0}
              step={0.01}
              defaultValue={product?.costPrice ?? 0}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-fg-muted">Solo visible aquí — nunca sale al público.</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="barcode">
              Código de barras
            </label>
            <input
              ref={barcodeRef}
              id="barcode"
              name="barcode"
              defaultValue={product?.barcode ?? ""}
              autoComplete="off"
              className={inputClass}
              placeholder="Opcional"
              onChange={(e) => scheduleDuplicateCheck(undefined, e.target.value)}
              onBlur={(e) => performDuplicateCheck(undefined, e.target.value)}
            />
          </div>

          <ImageUploadField
            defaultValue={product?.image}
            onUploadingChange={setImageUploading}
            autoImagePath={scannedImagePath}
          />

          <ImageGalleryField
            defaultValue={parseImagesJson(product?.images)}
            autoImages={scannedGalleryImages}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-fg">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={product?.isFeatured}
              className="h-4 w-4 rounded border-border-strong accent-accent"
            />
            Destacado
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-fg">
            <input
              type="checkbox"
              name="onSale"
              checked={onSale}
              onChange={(e) => setOnSale(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong accent-accent"
            />
            En oferta
          </label>

          {onSale && (
            <div className="flex items-center gap-2">
              <label htmlFor="salePrice" className={labelClass}>
                Precio oferta
              </label>
              <input
                id="salePrice"
                name="salePrice"
                type="number"
                min={0}
                step={0.01}
                defaultValue={product?.salePrice ?? ""}
                className="w-32 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        {state.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-semibold text-red-600 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 shrink-0 text-red-500" size={18} />
            <div>{state.error}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending || imageUploading}
            className={`inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-60 ${
              matchedProduct && !product
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-accent hover:bg-accent-hover"
            }`}
          >
            {matchedProduct && !product && <PlusCircle size={16} />}
            {isPending
              ? "Guardando..."
              : imageUploading
              ? "Subiendo imagen..."
              : matchedProduct && !product
              ? "Guardar y Actualizar Stock"
              : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/taller-control/productos")}
            className="rounded-full border border-border-strong px-7 py-3 text-sm font-bold text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
