/** Plain util, deliberately outside actions.ts: that file is "use server",
 *  and every export from a "use server" file must be an async Server
 *  Action — a synchronous helper like this one isn't allowed to live
 *  there. Same helper as caja/month.ts, kept local so each admin section
 *  stays self-contained (existing convention in this codebase). */

/** "2026-09" for the given date, defaulting to now. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** [start, end) — end is the 1st of the NEXT month, exclusive upper bound. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 1);
  return { start, end };
}
