/**
 * Utility functions for handling quotation dates accurately in Peru (America/Lima, UTC-5).
 * Prevents UTC day-shift bugs where a date registered as 01/10/2026 renders as 30/09/2026.
 */

export const COMPANY_RUC = process.env.NEXT_PUBLIC_COMPANY_RUC || "20000000000";
export const COMPANY_NAME = "INFOSISTEL E.I.R.L.";
export const COMPANY_BUSINESS_NAME = "INFORMATICA, SISTEMAS Y TELECOMUNICACIONES E.I.R.L.";
export const COMPANY_EMAIL = "ecaballero@infosistel.com.pe";
export const COMPANY_PHONE = "+51 900 000 000";
export const COMPANY_WEB = "https://www.infosistel.com.pe/";

export const COMPANY_BANK_ACCOUNTS = [
  {
    bank: "Banco de la Nación",
    type: "Cuenta Corriente",
    accountNumber: "00-381-139530",
    cci: "018-381-000381139530-44",
    holder: "INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL",
  },
  {
    bank: "Interbank Soles",
    type: "Cuenta Negocios",
    accountNumber: "5003008920133",
    cci: "00350000300892013366",
    holder: "INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL",
  },
  {
    bank: "Interbank Dólares",
    type: "Cuenta Negocios",
    accountNumber: "5003008920140",
    cci: "00350000300892014061",
    holder: "INFORMATICA, SISTEMAS Y TELECOMUNICACIONES EIRL",
  },
];
export const COMPANY_YAPE_PLIN = "900 000 000 (Laboratorio INFOSISTEL / Infosistel)";

/**
 * Returns "YYYY-MM-DD" for current day in Peru (America/Lima).
 * Avoids browser/server hour rollover issues (e.g. at 7:00 PM local time).
 */
export function getPeruTodayString(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const lima = new Date(now.getTime() - 5 * 3600 * 1000);
    return lima.toISOString().slice(0, 10);
  }
}

/**
 * Converts any Date or string into "YYYY-MM-DD" for HTML <input type="date">.
 */
export function toDateInputValue(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return getPeruTodayString();
  if (typeof dateVal === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateVal.trim());
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return getPeruTodayString();

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses "YYYY-MM-DD" from form input into a Date anchored at 12:00:00 UTC (noon UTC).
 * This guarantees that across UTC-5 (Peru) and UTC+0, the calendar date NEVER shifts backward or forward.
 */
export function parseDateInputToUtcNoon(dateStr?: string | null): Date {
  const clean = (dateStr || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean);
  if (m) {
    return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`);
  }
  const today = getPeruTodayString();
  return new Date(`${today}T12:00:00.000Z`);
}

/**
 * Formats a Date or string to display as "DD/MM/YYYY" without timezone offset distortion.
 */
export function formatQuotationDate(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return "-";
  if (typeof dateVal === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateVal.trim());
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return "-";

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Adds days to a quotation issue date and returns "DD/MM/YYYY" cleanly.
 */
export function addQuotationDays(dateVal: Date | string | null | undefined, days: number): string {
  if (!dateVal) return "-";
  let year: number;
  let month: number;
  let day: number;

  if (typeof dateVal === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateVal.trim());
    if (m) {
      year = parseInt(m[1], 10);
      month = parseInt(m[2], 10) - 1;
      day = parseInt(m[3], 10);
    } else {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "-";
      year = d.getUTCFullYear();
      month = d.getUTCMonth();
      day = d.getUTCDate();
    }
  } else {
    if (isNaN(dateVal.getTime())) return "-";
    year = dateVal.getUTCFullYear();
    month = dateVal.getUTCMonth();
    day = dateVal.getUTCDate();
  }

  const target = new Date(Date.UTC(year, month, day + (days || 0), 12, 0, 0));
  const rDay = String(target.getUTCDate()).padStart(2, "0");
  const rMonth = String(target.getUTCMonth() + 1).padStart(2, "0");
  const rYear = target.getUTCFullYear();
  return `${rDay}/${rMonth}/${rYear}`;
}
