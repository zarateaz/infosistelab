/** Plain util, deliberately outside actions.ts: that file is "use server",
 *  and every export from a "use server" file must be an async Server
 *  Action — a synchronous helper like this one isn't allowed to live
 *  there (Next.js build error: "Server Actions must be async functions"). */

/** "2026-09" for the given date, defaulting to now, in whichever machine's
 *  local time zone runs this — used only for "what month is it right now"
 *  contexts (the report page's default month, making sure the current
 *  month always appears in the month list). Never use this to derive the
 *  month of a STORED transaction date — use monthKeyUTC for that. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Same "YYYY-MM" shape as monthKey, but for a stored transaction date —
 *  anchored in UTC like dateToInputValue below, for the same reason (see
 *  its comment). Used to group transactions by month; local getters here
 *  would file a UTC-midnight-stored Sept 1st transaction under August
 *  whenever this runs somewhere west of UTC (e.g. this app's dev box, in
 *  Lima, reading a row written by the VPS, which runs in UTC). */
export function monthKeyUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-09-05" for right now, in whichever machine/browser runs this —
 *  used only to default a fresh "Registrar movimiento" form to today.
 *  Never use this to redisplay a stored transaction date (see
 *  dateToInputValue) — that's the exact bug this split exists to prevent. */
export function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Converts a STORED transaction date back into "YYYY-MM-DD" — anchored in
 *  UTC, the same anchor parseDateInput below uses to build it. This admin
 *  panel's dev box runs in America/Lima but the VPS it deploys to runs in
 *  UTC; reading a stored date with LOCAL getters (`date.getDate()` etc., as
 *  this function used to) gives a different calendar day depending on
 *  which of those — or the visiting browser's own time zone — happens to
 *  do the reading (a "2026-09-01" entry silently redisplaying as
 *  "2026-08-31"). A date typed into a plain <input type="date"> never had
 *  a time-of-day or time zone to begin with, so anchoring both write and
 *  read in UTC is what makes it round-trip identically everywhere. */
export function dateToInputValue(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Parses an <input type="date"> value ("YYYY-MM-DD") into a UTC-midnight
 *  Date. Pair with dateToInputValue (UTC getters), never local getters, to
 *  read it back — see that function's comment for why. */
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}
