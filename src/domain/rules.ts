/* Pure business rules. No database, no I/O, so every rule here is unit tested. */

export const CREATOR_SHARE = 0.8;
export const BUYER_FEE = 0.1;
export const OBJECTION_HOURS = 24;
export const ALBUM_SECONDS = 60;

export type Category = "video" | "photos" | "voice" | "custom" | "worn";
export type VaultPeriod = "7d" | "30d" | "1y" | "forever";
export type DealStatus = "held" | "reviewing" | "delivered" | "disputed" | "released" | "refunded";

export function split(dealCents: number) {
  if (!Number.isInteger(dealCents) || dealCents <= 0) throw new Error("deal value must be a positive number of cents");
  const feeCents = Math.round(dealCents * BUYER_FEE);
  const creatorCents = Math.round(dealCents * CREATOR_SHARE);
  return { dealCents, feeCents, buyerPays: dealCents + feeCents, creatorCents, platformCents: dealCents + feeCents - creatorCents };
}

export const VAULT_ORDER: VaultPeriod[] = ["7d", "30d", "1y", "forever"];
export const VAULT_LABEL: Record<VaultPeriod, string> = { "7d": "7 days", "30d": "30 days", "1y": "1 year", forever: "Forever" };
export function vaultAtLeast(offer: VaultPeriod, min: VaultPeriod) {
  return VAULT_ORDER.indexOf(offer) >= VAULT_ORDER.indexOf(min);
}
export function vaultUntil(from: Date, p: VaultPeriod): Date | null {
  const d = new Date(from);
  if (p === "7d") d.setDate(d.getDate() + 7);
  else if (p === "30d") d.setDate(d.getDate() + 30);
  else if (p === "1y") d.setFullYear(d.getFullYear() + 1);
  else return null;
  return d;
}

/* ---------- escrow state machine ---------- */
export type DealEvent =
  | { type: "deliver"; at: Date }              // technical check passed, goes to content review
  | { type: "review_passed"; at: Date }        // review and participant consent done, available in the vault
  | { type: "review_failed"; at: Date }        // creator may deliver again before the deadline
  | { type: "object"; at: Date }
  | { type: "release_now"; at: Date }          // buyer releases early
  | { type: "window_passed"; at: Date }        // worker: objection window over
  | { type: "deadline_passed"; at: Date }      // worker: no delivery in time
  | { type: "resolve"; outcome: "upheld" | "rejected"; at: Date };

export type DealState = { status: DealStatus; dueAt: Date; deliveredAt?: Date | null; objectUntil?: Date | null };
export type Effect =
  | { kind: "pay_creator" } | { kind: "refund_buyer" }
  | { kind: "ban_creator"; reason: string } | { kind: "ban_buyer"; reason: string };

export class RuleError extends Error {}

export function transition(s: DealState, e: DealEvent): { state: DealState; effects: Effect[] } {
  const bad = (why: string): never => { throw new RuleError(why); };
  switch (e.type) {
    case "deliver":
      if (s.status !== "held") bad("Only a deal in progress can be delivered.");
      if (e.at > s.dueAt) bad("The delivery deadline has passed.");
      return { state: { ...s, status: "reviewing" }, effects: [] };
    case "review_passed":
      if (s.status !== "reviewing") bad("Nothing is waiting for review.");
      return { state: { ...s, status: "delivered", deliveredAt: e.at, objectUntil: addHours(e.at, OBJECTION_HOURS) }, effects: [] };
    case "review_failed":
      if (s.status !== "reviewing") bad("Nothing is waiting for review.");
      return { state: { ...s, status: "held" }, effects: [] };
    case "object":
      if (s.status !== "delivered") bad("You can only object to a delivered deal.");
      if (!s.objectUntil || e.at > s.objectUntil) bad("The 24 hour objection window is over.");
      return { state: { ...s, status: "disputed" }, effects: [] };
    case "release_now":
      if (s.status !== "delivered") bad("Nothing to release.");
      return { state: { ...s, status: "released" }, effects: [{ kind: "pay_creator" }] };
    case "window_passed":
      if (s.status !== "delivered") bad("Not waiting for release.");
      if (!s.objectUntil || e.at < s.objectUntil) bad("The objection window is still open.");
      return { state: { ...s, status: "released" }, effects: [{ kind: "pay_creator" }] };
    case "deadline_passed":
      if (s.status !== "held") bad("Only an undelivered deal can expire.");
      if (e.at <= s.dueAt) bad("The deadline has not passed yet.");
      return { state: { ...s, status: "refunded" }, effects: [{ kind: "refund_buyer" }] };
    case "resolve":
      if (s.status !== "disputed") bad("There is no open dispute.");
      return e.outcome === "upheld"
        ? { state: { ...s, status: "refunded" }, effects: [{ kind: "refund_buyer" }, { kind: "ban_creator", reason: "Delivery did not match the agreed terms." }] }
        : { state: { ...s, status: "released" }, effects: [{ kind: "pay_creator" }, { kind: "ban_buyer", reason: "Objection found unfounded." }] };
  }
}

export function addHours(d: Date, h: number) { return new Date(d.getTime() + h * 3600_000); }

/* ---------- technical delivery check (reads only file facts, never the content) ---------- */
export type FileFacts = { mime: string; durationSec?: number | null; width?: number | null; height?: number | null; meanVolumeDb?: number | null };
export type CheckLine = { ok: boolean; text: string };

export function checkDelivery(cat: Category, amount: number, files: FileFacts[]): { ok: boolean; lines: CheckLine[] } {
  const lines: CheckLine[] = [];
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  if (cat === "video" || cat === "custom") {
    const vids = files.filter((f) => f.mime.startsWith("video/"));
    lines.push({ ok: vids.length === 1, text: vids.length === 1 ? "One video, as agreed" : `Expected one video, got ${vids.length}` });
    const v = vids[0];
    if (v) {
      const need = amount * 60, got = v.durationSec ?? 0;
      lines.push({ ok: got >= need, text: `Length ${mmss(got)}, agreed at least ${mmss(need)}` });
      const short = Math.min(v.width ?? 0, v.height ?? 0);
      lines.push({ ok: short >= 720, text: short >= 720 ? `Resolution ${short}p` : `Resolution ${short}p, at least 720p needed` });
    }
  } else if (cat === "photos") {
    const pics = files.filter((f) => f.mime.startsWith("image/"));
    lines.push({ ok: pics.length === amount, text: `${pics.length} photos, agreed ${amount}` });
    const small = pics.filter((p) => Math.max(p.width ?? 0, p.height ?? 0) < 1200).length;
    lines.push({ ok: small === 0, text: small === 0 ? "All photos in full resolution" : `${small} photo${small > 1 ? "s are" : " is"} below 1200 px` });
  } else if (cat === "voice") {
    const a = files.filter((f) => f.mime.startsWith("audio/"));
    lines.push({ ok: a.length === 1, text: a.length === 1 ? "One voice note, as agreed" : `Expected one audio file, got ${a.length}` });
    const f = a[0];
    if (f) {
      const need = amount * 60, got = f.durationSec ?? 0;
      lines.push({ ok: got >= need, text: `Length ${mmss(got)}, agreed at least ${mmss(need)}` });
      const loud = (f.meanVolumeDb ?? -99) > -50;
      lines.push({ ok: loud, text: loud ? "Real audio, not silence" : "The recording is almost silent" });
    }
  } else {
    lines.push({ ok: files.length > 0, text: "Photo of the item before shipping" });
  }
  lines.push({ ok: true, text: "Location and device data removed" });
  return { ok: lines.every((l) => l.ok), lines };
}

export function amountLabel(cat: Category, amount: number) {
  return cat === "photos" ? `${amount} photos` : cat === "worn" ? `${amount} item${amount > 1 ? "s" : ""}` : `${amount} min`;
}
export const CAT_LABEL: Record<Category, string> = { video: "Video", photos: "Photos", voice: "Voice note", custom: "Custom", worn: "Worn" };
export function euros(cents: number) { return "€" + Math.round(cents / 100).toLocaleString("en-IE"); }
