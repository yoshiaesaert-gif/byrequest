import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { deals, requests, users, ledger, referralRewards } = schema;
const TZ = "Europe/Brussels";

/* Everything a creator earned, built from the deals themselves (the ledger mirrors the payment partner).
   One income line per money moment: a released deal, a tip, an invite reward. Amounts are what the creator receives. */
export type Period = "7d" | "30d" | "90d" | "ytd" | "12m" | "all";
export const PERIODS: [Period, string][] = [["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["ytd", "This year"], ["12m", "12 months"], ["all", "All time"]];
export const isPeriod = (p: unknown): p is Period => PERIODS.some(([k]) => k === p);

export type Line = { id: string; at: string; kind: "deal" | "tip" | "invite"; title: string; category: string | null; buyer: string | null; dealCents: number; feeCents: number; cents: number; dealId: string | null };

function range(p: Period, now = new Date()) {
  const end = now;
  const day = 86400_000;
  let start: Date;
  if (p === "7d") start = new Date(now.getTime() - 7 * day);
  else if (p === "30d") start = new Date(now.getTime() - 30 * day);
  else if (p === "90d") start = new Date(now.getTime() - 90 * day);
  else if (p === "ytd") start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  else if (p === "12m") start = new Date(now.getTime() - 365 * day);
  else start = new Date(Date.UTC(2024, 0, 1));
  const len = end.getTime() - start.getTime();
  return { start, end, prevStart: new Date(start.getTime() - len), prevEnd: start };
}

async function lines(creatorId: string): Promise<Line[]> {
  const rows = await db.select({ d: deals, title: requests.title, category: requests.category, buyer: users.handle })
    .from(deals).innerJoin(requests, eq(requests.id, deals.requestId)).innerJoin(users, eq(users.id, deals.buyerId))
    .where(and(eq(deals.creatorId, creatorId), eq(deals.status, "released"))).orderBy(desc(deals.settledAt)).limit(5000);
  const out: Line[] = [];
  for (const { d, title, category, buyer } of rows) {
    const at = (d.settledAt ?? d.deliveredAt ?? d.createdAt).toISOString();
    out.push({ id: d.id, at, kind: "deal", title, category, buyer, dealCents: d.dealCents, feeCents: d.dealCents - d.creatorCents, cents: d.creatorCents, dealId: d.id });   // feeCents: the platform share of this deal, so value minus share equals what the creator got
    if (d.tipCreatorCents > 0) out.push({ id: d.id + ":tip", at: (d.tipAt ?? d.settledAt ?? d.createdAt).toISOString(), kind: "tip", title, category, buyer, dealCents: d.tipCents, feeCents: d.tipCents - d.tipCreatorCents - d.tipVatCents, cents: d.tipCreatorCents, dealId: d.id });
  }
  const inv = await db.select().from(referralRewards).where(and(eq(referralRewards.referrerId, creatorId), eq(referralRewards.status, "paid"), sql`${referralRewards.cents} > 0`)).limit(2000);
  for (const r of inv) out.push({ id: r.id, at: (r.paidAt ?? r.createdAt).toISOString(), kind: "invite", title: r.kind === "welcome_bonus" ? "Welcome bonus" : "Invite reward", category: null, buyer: null, dealCents: r.cents, feeCents: 0, cents: r.cents, dealId: r.dealId });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/* The buckets for the chart: days for short periods, weeks up to half a year, months beyond. */
function series(list: Line[], start: Date, end: Date) {
  const span = (end.getTime() - start.getTime()) / 86400_000;
  const unit: "day" | "week" | "month" = span <= 31 ? "day" : span <= 190 ? "week" : "month";
  const key = (d: Date) => {
    const x = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
    if (unit === "month") return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
    if (unit === "week") { const m = new Date(x); m.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return m.toISOString().slice(0, 10); }
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };
  const buckets = new Map<string, { deals: number; tips: number; invites: number }>();
  const cur = new Date(start);
  while (cur <= end) { buckets.set(key(cur), { deals: 0, tips: 0, invites: 0 }); cur.setDate(cur.getDate() + 1); }
  for (const l of list) { const b = buckets.get(key(new Date(l.at))); if (!b) continue; if (l.kind === "deal") b.deals += l.cents; else if (l.kind === "tip") b.tips += l.cents; else b.invites += l.cents; }
  return { unit, points: [...buckets].map(([k, v]) => ({ k, ...v, total: v.deals + v.tips + v.invites })) };
}

export async function earnings(creatorId: string, p: Period) {
  const { start, end, prevStart, prevEnd } = range(p);   // start may move for "all", see below
  const [all, pendingRows, [held], [ratings], [ontime]] = await Promise.all([
    lines(creatorId),
    db.select({ id: deals.id, status: deals.status, cents: deals.creatorCents, dueAt: deals.dueAt, objectUntil: deals.objectUntil, title: requests.title, buyer: users.handle })
      .from(deals).innerJoin(requests, eq(requests.id, deals.requestId)).innerJoin(users, eq(users.id, deals.buyerId))
      .where(and(eq(deals.creatorId, creatorId), inArray(deals.status, ["held", "reviewing", "delivered", "disputed"]))).orderBy(deals.dueAt).limit(200),
    db.select({ c: sql<number>`coalesce(sum(${ledger.cents}),0)::int` }).from(ledger).where(and(eq(ledger.userId, creatorId), eq(ledger.entry, "payout_on_hold"))),
    db.select({ avg: sql<number>`coalesce(avg(${deals.buyerRating}),0)::float`, n: sql<number>`count(${deals.buyerRating})::int` }).from(deals).where(and(eq(deals.creatorId, creatorId), sql`${deals.buyerRating} is not null`)),
    db.select({ on: sql<number>`count(*) filter (where ${deals.deliveredAt} <= ${deals.dueAt})::int`, n: sql<number>`count(${deals.deliveredAt})::int` }).from(deals).where(eq(deals.creatorId, creatorId)),
  ]);
  // "All time" starts at the first income, not at a fixed date.
  if (p === "all" && all.length) { const first = new Date(all[all.length - 1].at); first.setHours(0, 0, 0, 0); start.setTime(first.getTime()); }
  const inP = all.filter((l) => l.at >= start.toISOString() && l.at <= end.toISOString());
  const inPrev = all.filter((l) => l.at >= prevStart.toISOString() && l.at < prevEnd.toISOString());
  const sum = (l: Line[], k?: Line["kind"]) => l.filter((x) => !k || x.kind === k).reduce((a, x) => a + x.cents, 0);
  const dealLines = inP.filter((l) => l.kind === "deal");

  // Buyers who came back: anyone with more than one released deal ever, among this period's buyers.
  const perBuyerAll = new Map<string, number>();
  for (const l of all) if (l.kind === "deal" && l.buyer) perBuyerAll.set(l.buyer, (perBuyerAll.get(l.buyer) ?? 0) + 1);
  const buyersP = new Map<string, { deals: number; cents: number }>();
  for (const l of inP) if (l.buyer && l.kind !== "invite") { const b = buyersP.get(l.buyer) ?? { deals: 0, cents: 0 }; if (l.kind === "deal") b.deals++; b.cents += l.cents; buyersP.set(l.buyer, b); }
  const repeat = [...buyersP.keys()].filter((b) => (perBuyerAll.get(b) ?? 0) > 1).length;

  const cats = new Map<string, number>();
  for (const l of inP) if (l.kind !== "invite") cats.set(l.category ?? "custom", (cats.get(l.category ?? "custom") ?? 0) + l.cents);

  const weekday = [0, 0, 0, 0, 0, 0, 0];
  for (const l of dealLines) weekday[(new Date(l.at).getDay() + 6) % 7] += l.cents;

  const s = series(inP, start, end);
  const best = s.points.reduce((a, x) => (x.total > a.total ? x : a), { k: "", total: 0, deals: 0, tips: 0, invites: 0 });
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const thisMonth = sum(all.filter((l) => new Date(l.at) >= monthStart));

  return {
    period: p, start: start.toISOString(), end: end.toISOString(),
    total: sum(inP), prevTotal: sum(inPrev),
    deals: sum(inP, "deal"), tips: sum(inP, "tip"), invites: sum(inP, "invite"),
    dealCount: dealLines.length, prevDealCount: inPrev.filter((l) => l.kind === "deal").length,
    avgDeal: dealLines.length ? Math.round(sum(inP, "deal") / dealLines.length) : 0,
    biggest: dealLines.reduce((a, l) => Math.max(a, l.cents), 0),
    tipCount: inP.filter((l) => l.kind === "tip").length,
    buyers: buyersP.size, repeatBuyers: repeat,
    lifetime: sum(all), thisMonth,
    pending: pendingRows.reduce((a, r) => a + r.cents, 0), pendingRows: pendingRows.map((r) => ({ ...r, dueAt: r.dueAt.toISOString(), objectUntil: r.objectUntil?.toISOString() ?? null })),
    onHold: held.c,
    rating: { avg: ratings.avg, n: ratings.n }, onTime: ontime.n ? ontime.on / ontime.n : null,
    categories: [...cats].sort((a, b) => b[1] - a[1]).map(([k, c]) => ({ k, cents: c })),
    topBuyers: [...buyersP].sort((a, b) => b[1].cents - a[1].cents).slice(0, 5).map(([handle, v]) => ({ handle, ...v })),
    weekday, series: s, best,
    lines: inP,
  };
}
export type Earnings = Awaited<ReturnType<typeof earnings>>;

/* Two decimals for statements; the app rounds to whole euros elsewhere. */
export const eur = (cents: number) => "€" + (cents / 100).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
