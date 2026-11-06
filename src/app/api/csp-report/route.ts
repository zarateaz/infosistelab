import { NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    const ip = getClientIP(request.headers);
    
    // Solo guardamos datos críticos del reporte para no saturar la BD
    const details = {
      blockedUri: report?.["csp-report"]?.["blocked-uri"],
      violatedDirective: report?.["csp-report"]?.["violated-directive"],
      documentUri: report?.["csp-report"]?.["document-uri"],
    };

    await logAudit({
      action: "CSP_VIOLATION",
      ipAddress: ip,
      details: JSON.stringify(details),
    });
  } catch (error) {
    // Los reportes CSP no deben tumbar el proceso ni devolver errores 500 al cliente
    console.error("Error procesando reporte CSP", error);
  }

  // 204 No Content es el estándar para un receptor de reportes
  return new Response(null, { status: 204 });
}
