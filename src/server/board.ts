import "server-only";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PLAN } from "@/content/house-plan";

const S = schema;
/* The board stays between 100 and 150 live requests. Team profiles top it up during the day at
   irregular moments, never at night, and repost requests nobody took after a pause, with another
   budget and closing date, so it keeps moving like a real board. */
export const BOARD = { min: 100, max: 150, dayCap: 25, rampCap: 40, perAuthor: 6, pauseDays: 5 } as const;

const brusselsHour = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Brussels" }).format(d));
// Today's target moves a little from day to day, between 115 and 145.
const target = (d: Date) => 115 + (Math.floor(d.getTime() / 86400_000) * 7919) % 31;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

type Item = { title: string; details: string; category: "video" | "photos" | "voice" | "custom"; amount: number; dealCents: number; who: string; ageMin: number; ageMax: number; face: "optional" | "not_needed"; minVault: "7d" | "30d" | "1y" | "forever"; dueHours: number; cover: string | null; lang: string; author: string; fresh: boolean };

export async function boardState(now = new Date()) {
  const live = and(eq(S.requests.status, "open"), gt(S.requests.closesAt, now));
  const [[open], [team], [today]] = await Promise.all([
    db.select({ n: count() }).from(S.requests).where(live),
    db.select({ n: count() }).from(S.requests).innerJoin(S.users, eq(S.users.id, S.requests.buyerId)).where(and(live, sql`(${S.users.house} or ${S.users.internal})`)),
    db.select({ n: count() }).from(S.requests).innerJoin(S.users, eq(S.users.id, S.requests.buyerId)).where(and(eq(S.users.house, true), gt(S.requests.createdAt, new Date(now.getTime() - 86400_000)))),
  ]);
  return { open: open.n, internal: team.n, external: open.n - team.n, postedToday: today.n, target: target(now) };
}

/* Called by the minute scheduler. Posts at most one request per call. */
export async function refillBoard(now = new Date(), force = false) {
  if (!force && (now.getUTCMinutes() % 6 !== 2 || Math.random() < 0.35)) return null;     // irregular moments
  const h = brusselsHour(now);
  if (!force && (h < 8 || h >= 23)) return null;
  const st = await boardState(now);
  if (st.open >= BOARD.max || st.open >= st.target) return null;
  if (st.postedToday >= (st.open < BOARD.min ? BOARD.rampCap : BOARD.dayCap)) return null;

  const house = await db.select({ id: S.users.id, handle: S.users.handle, open: sql<number>`(select count(*)::int from requests r where r.buyer_id = ${S.users.id} and r.status = 'open' and r.closes_at > now())` })
    .from(S.users).where(and(eq(S.users.house, true), sql`${S.users.deletedAt} is null`));
  if (!house.length) return null;
  const past = await db.execute<{ title: string; details: string; category: Item["category"]; amount: number; deal_cents: number; who: string; age_min: number; age_max: number; face: Item["face"]; min_vault: Item["minVault"]; due_hours: number; cover: string | null; lang: string; handle: string; last: string; live: boolean }>(sql`
    select distinct on (r.title) r.title, r.details, r.category, r.amount, r.deal_cents, r.who, r.age_min, r.age_max, r.face, r.min_vault, r.due_hours, r.cover, r.lang, u.handle,
      max(r.created_at) over (partition by r.title) as last,
      bool_or(r.status in ('open', 'in_review', 'matched') and r.closes_at > now()) over (partition by r.title) as live
    from requests r join users u on u.id = r.buyer_id where u.house and r.status <> 'rejected' order by r.title, r.created_at desc`);
  const seen = new Map(past.rows.map((r) => [r.title, r]));
  const pause = now.getTime() - BOARD.pauseDays * 86400_000;
  const pool: Item[] = [
    ...PLAN.filter((p) => !seen.has(p.title)).map((p) => ({ ...p, fresh: true })),
    ...past.rows.filter((r) => !r.live && new Date(r.last).getTime() < pause).map((r) => ({ title: r.title, details: r.details, category: r.category, amount: r.amount, dealCents: r.deal_cents, who: r.who, ageMin: r.age_min, ageMax: r.age_max, face: r.face, minVault: r.min_vault, dueHours: r.due_hours, cover: r.cover, lang: r.lang, author: r.handle, fresh: false })),
  ];
  if (!pool.length) return null;
  // New ones first, then the longest resting; a little chance keeps the order unpredictable.
  const fresh = pool.filter((p) => p.fresh);
  const it = fresh.length && Math.random() < 0.75 ? pick(fresh) : pick(pool);
  const own = house.find((u) => u.handle === it.author);
  const author = own && own.open < BOARD.perAuthor ? own : [...house].sort((a, b) => a.open - b.open || Math.random() - .5)[0];
  if (author.open >= BOARD.perAuthor) return null;
  const cents = it.fresh ? it.dealCents : Math.max(2500, Math.round(it.dealCents * (0.9 + Math.random() * 0.25) / 500) * 500);
  const days = 7 + Math.floor(Math.random() * 8);
  const [r] = await db.insert(S.requests).values({
    buyerId: author.id, title: it.title, details: it.details, category: it.category, amount: it.amount, dealCents: cents, who: it.who, ageMin: it.ageMin, ageMax: it.ageMax,
    face: it.face, minVault: it.minVault, dueHours: it.dueHours, cover: it.cover, lang: it.lang, status: "open", closesAt: new Date(now.getTime() + days * 86400_000 + Math.floor(Math.random() * 600) * 60_000),
    checkVerdict: "approve", reviewedAt: now,
  }).returning({ id: S.requests.id });
  return { posted: r.id, by: author.handle, title: it.title, open: st.open + 1 };
}
