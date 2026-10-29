import { CREATOR_SHARE } from "./rules";

/* The referral programme in numbers. Kept here so the invite page, the payout code and the tests
   always agree. */
export const REF_SHARE = 0.1;            // of what an invited creator nets, paid by ByRequest on top
export const REF_WINDOW_DAYS = 30;       // counted from the invited creator's first paid deal
export const FEE_GIFT_CAP_CENTS = 2000;  // a gifted service fee covers up to €20
export const REF_COOKIE = "brq_ref";
export const REF_COOKIE_DAYS = 30;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // no 0/O or 1/I/L, easy to read aloud
export function makeCode(handle: string, rnd: () => number = Math.random) {
  const head = handle.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 5) || "BRQ";
  let tail = ""; for (let i = 0; i < 4; i++) tail += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return `${head}-${tail}`;
}
export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "").slice(0, 16);
export const validCode = (c: string) => /^[A-Z0-9]{1,5}-[A-Z0-9]{4}$/.test(c);

/* 10% of the creator's net amount, when the deal was paid out within the window. */
export function creatorReward(creatorCents: number, windowEndsAt: Date, paidAt: Date) {
  return paidAt <= windowEndsAt ? Math.round(creatorCents * REF_SHARE) : 0;
}
export const windowEnd = (firstDealAt: Date) => new Date(firstDealAt.getTime() + REF_WINDOW_DAYS * 86400_000);

/* A gifted service fee: ByRequest pays the fee (up to the cap) and the VAT on it. */
export function giftFee(m: { dealCents: number; feeCents: number; vatRate: number; vatCents: number; total: number }) {
  const gift = Math.min(m.feeCents, FEE_GIFT_CAP_CENTS);
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
