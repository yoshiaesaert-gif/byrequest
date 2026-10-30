import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

/* Real outside activity only: accounts that are neither internal nor team profiles. Every figure
   compares today so far with yesterday and the same weekday last week up to the same clock time. */
const TZ = "Europe/Brussels";
const EXT = (a: string) => sql.raw(`not (${a}.internal or ${a}.house)`);
const day = (n: number) => sql`((date_trunc('day', now() at time zone ${TZ}) - (${n} || ' days')::interval) at time zone ${TZ})`;
const sofar = (n: number) => sql`(${day(n)} + (now() - ${day(0)}))`;

// Each source yields (at, k): when it happened and what to count once (a row id, or a person for "active").
const SOURCES: Record<string, SQL> = {
  signups: sql`select u.created_at at, u.id::text k from users u where ${EXT("u")} and u.deleted_at is null`,
  active: sql`select v.started_at at, v.user_id::text k from visits v join users u on u.id = v.user_id where ${EXT("u")}`,
  requests: sql`select r.created_at at, r.id::text k from requests r join users u on u.id = r.buyer_id where ${EXT("u")}`,
  offers: sql`select o.created_at at, o.id::text k from offers o join users u on u.id = o.creator_id where ${EXT("u")}`,
  messages: sql`select m.created_at at, m.id::text k from messages m join users u on u.id = m.sender_id where m.kind = 'e2e' and ${EXT("u")}
    union all select om.created_at, om.id::text from offer_messages om join users u on u.id = om.sender_id where ${EXT("u")}`,
  deals: sql`select d.created_at at, d.id::text k from deals d join users b on b.id = d.buyer_id join users c on c.id = d.creator_id where ${EXT("b")} or ${EXT("c")}`,
};
export type Metric = keyof typeof SOURCES;
export const METRICS = Object.keys(SOURCES) as Metric[];

async function series(src: SQL) {
  const [s] = (await db.execute<{ today: number; yday: number; lweek: number; w7: number; p7: number; total: number }>(sql`with e as (${src}) select
    count(distinct k) filter (where at >= ${day(0)})::int today,
    count(distinct k) filter (where at >= ${day(1)} and at < ${sofar(1)})::int yday,
    count(distinct k) filter (where at >= ${day(7)} and at < ${sofar(7)})::int lweek,
    count(distinct k) filter (where at >= ${day(6)})::int w7,
    count(distinct k) filter (where at >= ${day(13)} and at < ${day(6)})::int p7,
    count(distinct k)::int total from e`)).rows;
  const daily = (await db.execute<{ d: string; v: number }>(sql`with e as (${src}),
    days as (select to_char(g, 'YYYY-MM-DD') d from generate_series((now() at time zone ${TZ})::date - 29, (now() at time zone ${TZ})::date, interval '1 day') g),
    c as (select to_char(at at time zone ${TZ}, 'YYYY-MM-DD') d, count(distinct k)::int v from e where at >= ${day(29)} group by 1)
    select days.d, coalesce(c.v, 0)::int v from days left join c on c.d = days.d order by 1`)).rows;
  return { ...s, daily };
}

export async function activity() {
  const all = await Promise.all(METRICS.map(async (m) => [m, await series(SOURCES[m])] as const));
  const [people] = (await db.execute<{ accounts: number; creators: number; buyers: number }>(sql`select count(*)::int accounts,
    count(*) filter (where is_creator)::int creators, count(*) filter (where not is_creator)::int buyers from users u where ${EXT("u")} and u.deleted_at is null`)).rows;
  // What outside people did lately, newest first. Messages are counted, never read.
  const feed = (await db.execute<{ at: string; kind: string; who: string; uid: string; what: string | null }>(sql`
    (select u.created_at at, 'signup' kind, u.handle who, u.id::text uid, null what from users u where ${EXT("u")} and u.deleted_at is null order by 1 desc limit 8)
    union all (select r.created_at, 'request', u.handle, u.id::text, r.title from requests r join users u on u.id = r.buyer_id where ${EXT("u")} order by 1 desc limit 8)
    union all (select o.created_at, 'offer', u.handle, u.id::text, r.title from offers o join users u on u.id = o.creator_id join requests r on r.id = o.request_id where ${EXT("u")} order by 1 desc limit 8)
    union all (select m.created_at, 'message', u.handle, u.id::text, null from messages m join users u on u.id = m.sender_id where m.kind = 'e2e' and ${EXT("u")} order by 1 desc limit 8)
    union all (select om.created_at, 'message', u.handle, u.id::text, null from offer_messages om join users u on u.id = om.sender_id where ${EXT("u")} order by 1 desc limit 8)
    order by 1 desc limit 14`)).rows;
  return { m: Object.fromEntries(all) as Record<Metric, Awaited<ReturnType<typeof series>>>, people, feed };
}
