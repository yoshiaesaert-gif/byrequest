import { CREATOR_SHARE } from "./rules";

/* The referral programme in numbers. Staff change them in the back office (settings key "referral");
   these are the defaults. The invite page, the payout code and the tests all read the same config. */
export type RefConfig = { creatorPct: number; windowDays: number; buyerGift: boolean; feeGiftCapCents: number; welcomePct: number };
export const REF_DEFAULTS: RefConfig = { creatorPct: 10, windowDays: 30, buyerGift: true, feeGiftCapCents: 2000, welcomePct: 10 };   // welcomePct: extra for the invited creator on their first deal
export function cleanConfig(v: Partial<RefConfig> | null | undefined): RefConfig {
  const n = (x: unknown, lo: number, hi: number, d: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d);
  return { creatorPct: n(v?.creatorPct, 0, 30, REF_DEFAULTS.creatorPct), windowDays: n(v?.windowDays, 7, 365, REF_DEFAULTS.windowDays), buyerGift: typeof v?.buyerGift === "boolean" ? v.buyerGift : REF_DEFAULTS.buyerGift, feeGiftCapCents: n(v?.feeGiftCapCents, 0, 10000, REF_DEFAULTS.feeGiftCapCents), welcomePct: n(v?.welcomePct, 0, 30, REF_DEFAULTS.welcomePct) };
}
export const REF_COOKIE = "brq_ref";
export const REF_COOKIE_DAYS = 30;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // no 0/O or 1/I/L, easy to read aloud
/* Codes are random, 8 characters in two groups (K7QM-2XPA). Nothing in them points to a person. */
export function makeCode(rnd: () => number = Math.random) {
  let c = ""; for (let i = 0; i < 8; i++) c += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}
export const normalizeCode = (raw: string) => {
  const c = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
};
const CH = "[ABCDEFGHJKMNPQRSTUVWXYZ2-9]";
export const validCode = (c: string) => new RegExp(`^${CH}{4}-${CH}{4}$`).test(c);   // only our own alphabet, so older name based codes never pass

/* The bonus balance: transfer from €10, or use it to pay for a request. */
export const WITHDRAW_MIN_CENTS = 1000;
export const creditFor = (totalCents: number, balanceCents: number) => Math.max(0, Math.min(totalCents, balanceCents));

/* The creator bonus: a share of what the creator nets, when the deal was paid out within the window. */
export function creatorReward(creatorCents: number, pct: number, windowEndsAt: Date, paidAt: Date) {
  return paidAt <= windowEndsAt ? Math.round(creatorCents * pct / 100) : 0;
}
export const windowEnd = (firstDealAt: Date, days: number) => new Date(firstDealAt.getTime() + days * 86400_000);

/* Bonuses are bundled and paid once a week, on Monday, so nobody can read single deals of a friend
   from them. Everything earned before this Monday 00:00 (UTC) is in this week's payout. */
export function weekStart(now: Date) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}
export const nextPayout = (now: Date) => new Date(weekStart(now).getTime() + 7 * 86400_000);

/* A gifted service fee: ByRequest pays the fee (up to the cap) and the VAT on it. */
export function giftFee(m: { dealCents: number; feeCents: number; vatRate: number; vatCents: number; total: number }, cap = REF_DEFAULTS.feeGiftCapCents) {
  const gift = Math.min(m.feeCents, cap);
  const feeCents = m.feeCents - gift;
  const vatCents = Math.round((m.dealCents + feeCents) * m.vatRate / 10000);
  return { ...m, feeCents, vatCents, total: m.dealCents + feeCents + vatCents, giftCents: gift };
}

/* A tip is all in: the buyer pays exactly what they pick. VAT comes out of it, the creator gets the
   same share as on a deal, ByRequest keeps the rest. */
export const TIP_CHOICES = [500, 1000, 2000];
export const TIP_MIN_CENTS = 200, TIP_MAX_CENTS = 20000;
export function tipSplit(tipCents: number, vatRateBp: number) {
  const net = Math.round(tipCents * 10000 / (10000 + vatRateBp));
  const creatorCents = Math.round(net * CREATOR_SHARE);
  return { tipCents, vatCents: tipCents - net, creatorCents, platformCents: net - creatorCents };
}
