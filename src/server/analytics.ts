import "server-only";
import { and, desc, eq, gt, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { visits, visitEvents, users } = schema;
const IDLE_MS = 30 * 60_000;                       // a visit ends after 30 minutes without activity
const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|headless|lighthouse|render/i;

export type Beat = { v: string; s?: string; k: "page" | "click" | "ping"; p: string; l?: string; r?: string; lang?: string };

function parseUa(ua: string) {
  const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "mobile" : "desktop";
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\//i.test(ua) ? "Opera" : /samsungbrowser/i.test(ua) ? "Samsung" : /firefox|fxios/i.test(ua) ? "Firefox" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Other";
  const os = /iphone|ipad|ios/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os/i.test(ua) ? "macOS" : /windows/i.test(ua) ? "Windows" : /linux/i.test(ua) ? "Linux" : "Other";
  return { device, browser, os };
}

/* Location from the IP, looked up once per visit in the background. */
async function locate(id: string, ip: string) {
  if (!ip || /^(127\.|10\.|192\.168\.|::1|fc|fd)/.test(ip)) return;
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,city`, { signal: AbortSignal.timeout(3000) });
    const j = (await r.json()) as { success?: boolean; country?: string; city?: string };
    if (j.success) await db.update(visits).set({ country: j.country ?? null, city: j.city ?? null }).where(eq(visits.id, id));
  } catch { /* location stays unknown */ }
}

export async function beat(b: Beat, h: { ip: string; ua: string; userId: string | null; refCode: string | null }) {
  if (BOT.test(h.ua) || !b.v || b.v.length > 64 || b.p.startsWith("/admin") || b.p.startsWith("/api")) return null;
  const now = new Date();
  let v = b.s ? await db.query.visits.findFirst({ where: and(eq(visits.id, b.s), eq(visits.visitorId, b.v)) }) : null;
  // No cookie and no stored id: the visit is found again by its anonymous daily id, as long as it was active in the last 30 minutes.
  if (!v && b.v.startsWith("a_")) v = await db.query.visits.findFirst({ where: and(eq(visits.visitorId, b.v), gt(visits.lastAt, new Date(now.getTime() - IDLE_MS))), orderBy: desc(visits.lastAt) });
  if (v && now.getTime() - v.lastAt.getTime() > IDLE_MS) v = null;
  if (!v) {
    if (b.k === "ping") return null;
    const url = new URL(b.p, "https://x");
    const utm = Object.fromEntries([...url.searchParams].filter(([k]) => k.startsWith("utm_")).slice(0, 5).map(([k, x]) => [k, x.slice(0, 80)]));
    let ref: string | null = null;
    try { if (b.r) { const host = new URL(b.r).host; ref = /byrequest\.me$/.test(host) ? null : host; } } catch { /* no referrer */ }
    const code = url.pathname.startsWith("/r/") ? url.pathname.slice(3, 20) : h.refCode;
    [v] = await db.insert(visits).values({ visitorId: b.v, userId: h.userId, ip: h.ip || null, ...parseUa(h.ua), lang: b.lang?.slice(0, 8) ?? null, referrer: ref, utm: Object.keys(utm).length ? utm : null, refCode: code?.slice(0, 20) ?? null, landing: b.p.slice(0, 300) }).returning();
    void locate(v.id, h.ip);
  }
  if (b.k !== "ping") await db.insert(visitEvents).values({ visitId: v.id, kind: b.k, path: b.p.slice(0, 300), label: b.l?.slice(0, 80) ?? null });
  await db.update(visits).set({ lastAt: now, userId: v.userId ?? h.userId, pages: b.k === "page" ? sql`${visits.pages} + 1` : visits.pages, clicks: b.k === "click" ? sql`${visits.clicks} + 1` : visits.clicks }).where(eq(visits.id, v.id));
  return v.id;
}

/* ---------- the staff dashboard ---------- */
const TZ = "Europe/Brussels";
/* Team browsers stay out of every number: any visitor id that was ever signed in as an internal account. */
const GUEST = sql`${visits.visitorId} not in (select t.visitor_id from visits t join users tu on tu.id = t.user_id where tu.internal)`;
const dayStart = (offsetDays: number) => sql`(date_trunc('day', now() at time zone ${TZ}) - (${offsetDays} || ' days')::interval) at time zone ${TZ}`;

async function kpis(from: ReturnType<typeof dayStart>, to: ReturnType<typeof dayStart> | null) {
  const w = and(GUEST, to ? and(gte(visits.startedAt, from), lt(visits.startedAt, to)) : gte(visits.startedAt, from));
  const [r] = await db.select({
    visitors: sql<number>`count(distinct ${visits.visitorId})::int`, visits: sql<number>`count(*)::int`,
    pages: sql<number>`coalesce(sum(${visits.pages}),0)::int`, clicks: sql<number>`coalesce(sum(${visits.clicks}),0)::int`,
    avgSec: sql<number>`coalesce(avg(extract(epoch from ${visits.lastAt} - ${visits.startedAt})),0)::int`,
    bounce: sql<number>`coalesce(avg(case when ${visits.pages} <= 1 and ${visits.clicks} = 0 then 1 else 0 end),0)::float`,
    referred: sql<number>`count(*) filter (where ${visits.refCode} is not null)::int`,
    loggedIn: sql<number>`count(distinct ${visits.userId})::int`,
  }).from(visits).where(w);
  const [s] = await db.select({ n: sql<number>`count(*) filter (where ${users.internal} = false)::int` }).from(users).where(to ? and(gte(users.createdAt, from), lt(users.createdAt, to)) : gte(users.createdAt, from));
  return { ...r, signups: s.n };
}

export async function dashboard() {
  // Fair comparisons: today so far against yesterday and the same weekday last week up to the same clock time.
  const sofar = (n: number) => sql`${dayStart(n)} + (now() - ${dayStart(0)})`;
  const [today, yesterday, lastWeek, d7, prev7] = await Promise.all([kpis(dayStart(0), null), kpis(dayStart(1), sofar(1)), kpis(dayStart(7), sofar(7)), kpis(dayStart(6), null), kpis(dayStart(13), dayStart(6))]);
  const hourly = async (o: number) => (await db.execute<{ h: number; v: number; u: number }>(sql`select extract(hour from ${visits.startedAt} at time zone ${TZ})::int h, count(*)::int v, count(distinct ${visits.visitorId})::int u from ${visits} where ${GUEST} and ${visits.startedAt} >= ${dayStart(o)} and ${visits.startedAt} < ${dayStart(o - 1)} group by 1`)).rows;
  const [hToday, hYesterday, hLastWeek] = await Promise.all([hourly(0), hourly(1), hourly(7)]);
  const daily = (await db.execute<{ d: string; v: number; u: number; p: number; s: number; b: number; r: number }>(sql`
    with days as (select to_char(g, 'YYYY-MM-DD') d from generate_series((now() at time zone ${TZ})::date - 29, (now() at time zone ${TZ})::date, interval '1 day') g),
    v as (select to_char(${visits.startedAt} at time zone ${TZ}, 'YYYY-MM-DD') d, count(*)::int v, count(distinct ${visits.visitorId})::int u, coalesce(sum(${visits.pages}),0)::int p,
      coalesce(avg(extract(epoch from ${visits.lastAt} - ${visits.startedAt})),0)::int s, coalesce(avg(case when ${visits.pages} <= 1 and ${visits.clicks} = 0 then 1 else 0 end),0)::float b, count(*) filter (where ${visits.refCode} is not null)::int r
      from ${visits} where ${GUEST} and ${visits.startedAt} >= ${dayStart(29)} group by 1)
    select days.d, coalesce(v.v,0) v, coalesce(v.u,0) u, coalesce(v.p,0) p, coalesce(v.s,0) s, coalesce(v.b,0) b, coalesce(v.r,0) r from days left join v on v.d = days.d order by 1`)).rows;
  const signupsDaily = (await db.execute<{ d: string; n: number }>(sql`select to_char(${users.createdAt} at time zone ${TZ}, 'YYYY-MM-DD') d, count(*)::int n from ${users} where ${users.createdAt} >= ${dayStart(29)} and ${users.internal} = false group by 1`)).rows;
  const top = async (col: ReturnType<typeof sql>, where = sql`true`, n = 8) => (await db.execute<{ k: string; n: number }>(sql`select ${col} k, count(*)::int n from ${visits} where ${GUEST} and ${visits.startedAt} >= ${dayStart(6)} and ${where} group by 1 order by 2 desc limit ${n}`)).rows;
  const [countries, cities, devices, browsers, referrers, codes, landings] = await Promise.all([
    top(sql`coalesce(${visits.country}, 'Unknown')`), top(sql`coalesce(${visits.city} || ', ' || ${visits.country}, 'Unknown')`), top(sql`${visits.device}`), top(sql`${visits.browser} || ' · ' || ${visits.os}`),
    top(sql`coalesce(${visits.referrer}, 'Direct')`), top(sql`${visits.refCode}`, sql`${visits.refCode} is not null`), top(sql`split_part(${visits.landing}, '?', 1)`)]);
  const ev = async (kind: string) => (await db.execute<{ k: string; n: number }>(sql`select ${kind === "page" ? sql`split_part(${visitEvents.path}, '?', 1)` : sql`coalesce(${visitEvents.label}, ${visitEvents.path})`} k, count(*)::int n from ${visitEvents} where ${visitEvents.visitId} not in (select id from visits where not (${GUEST})) and ${visitEvents.at} >= ${dayStart(6)} and ${visitEvents.kind} = ${kind} group by 1 order by 2 desc limit 10`)).rows;
  const [pages, clicks] = await Promise.all([ev("page"), ev("click")]);
  const live = await db.select({ n: sql<number>`count(distinct ${visits.visitorId})::int` }).from(visits).where(and(GUEST, gt(visits.lastAt, new Date(Date.now() - 5 * 60_000))));
  const recent = await db.select({ v: visits, handle: users.handle, internal: users.internal }).from(visits).leftJoin(users, eq(users.id, visits.userId)).where(GUEST).orderBy(desc(visits.lastAt)).limit(40);
  const hour = Number((await db.execute<{ h: number }>(sql`select extract(hour from now() at time zone ${TZ})::int h`)).rows[0].h);
  return { today, yesterday, lastWeek, d7, prev7, hToday, hYesterday, hLastWeek, hour, daily, signupsDaily, countries, cities, devices, browsers, referrers, codes, landings, pages, clicks, live: live[0].n, recent };
}

export async function visitDetail(id: string) {
  const v = await db.select({ v: visits, handle: users.handle }).from(visits).leftJoin(users, eq(users.id, visits.userId)).where(eq(visits.id, id)).limit(1);
  if (!v[0]) return null;
  const events = await db.select().from(visitEvents).where(eq(visitEvents.visitId, id)).orderBy(visitEvents.at).limit(500);
  const others = await db.select({ id: visits.id, startedAt: visits.startedAt, pages: visits.pages }).from(visits).where(eq(visits.visitorId, v[0].v.visitorId)).orderBy(desc(visits.startedAt)).limit(20);
  return { ...v[0], events, others };
}

/* Raw visits are kept 13 months, then removed. */
export async function purgeVisits() {
  const d = new Date(); d.setMonth(d.getMonth() - 13);
  return (await db.delete(visits).where(lt(visits.startedAt, d)).returning({ id: visits.id })).length;
}
