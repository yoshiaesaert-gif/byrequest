import { cache } from "react";

/* Times in the back office follow the staff member's own computer (the browser tells us through a cookie).
   Everyone else, and everything outside a staff request, stays on Belgian time. */
export const DEFAULT_TZ = "Europe/Brussels";
export const TZ_COOKIE = "brq_tz";
export function validTz(z?: string | null) {
  if (!z) return null;
  try { new Intl.DateTimeFormat("en", { timeZone: z }); return z; } catch { return null; }
}
const box = cache(() => ({ tz: null as string | null }));
export function setRequestTz(tz: string | null) { try { box().tz = validTz(tz); } catch { /* outside a request */ } }
export function currentTz(): string {
  if (typeof window !== "undefined") {
    const c = document.cookie.match(/(?:^|; )brq_tz=([^;]+)/)?.[1];
    return validTz(c ? decodeURIComponent(c) : null) ?? DEFAULT_TZ;
  }
  try { return box().tz ?? DEFAULT_TZ; } catch { return DEFAULT_TZ; }
}
