import { notFound } from "next/navigation";
import { getQuotationByCode } from "@/app/taller-control/(panel)/cotizaciones/actions";
import { PublicCotizacionClient } from "./PublicCotizacionClient";

export const dynamic = "force-dynamic";

export default async function PublicCotizacionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const quotation = await getQuotationByCode(code);

  if (!quotation) {
    notFound();
  }

  return <PublicCotizacionClient quotation={quotation} />;
}
