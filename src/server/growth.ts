import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema as S } from "@/db";

/* Growth numbers for an outside marketing agent, behind a private read-only link. Only counts and sums per day,
   per landing page and per campaign: never names, emails, handles of buyers, chats or what anyone asked for.
   Team accounts, team profiles and automated visits (data centres) are left out. */
const TZ = "Europe/Brussels";
const KEY = "metrics_link";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function metricsLink() {
  const r = await db.query.settings.findFirst({ where: eq(S.settings.key, KEY) });
  return (r?.value as { hash: string; createdAt: string; by: string } | undefined) ?? null;
}
export async function newMetricsLink(by: string) {
  const token = randomBytes(24).toString("base64url");
  const value = { hash: hash(token), createdAt: new Date().toISOString(), by };
  await db.insert(S.settings).values({ key: KEY, value }).onConflictDoUpdate({ target: S.settings.key, set: { value, updatedAt: new Date() } });
  return token;
}
export async function revokeMetricsLink() { await db.delete(S.settings).where(eq(S.settings.key, KEY)); }
export async function validToken(token: string) {
  const l = await metricsLink();
  return !!l && token.length > 20 && l.hash === hash(token);
}

const rows = async <T,>(q: ReturnType<typeof sql>) => (await db.execute<T & Record<string, unknown>>(q)).rows as T[];
const REAL = sql`u.internal = false and u.house = false`;
const HUMAN = sql`v.bot = false and v.visitor_id not in (select t.visitor_id from visits t join users tu on tu.id = t.user_id where tu.internal)`;
const day = (col: ReturnType<typeof sql>) => sql`to_char(${col} at time zone ${TZ}, 'YYYY-MM-DD')`;

export async function growthMetrics(daysBack = 30) {
  const n = Math.min(Math.max(daysBack, 1), 90);
  const since = sql`(date_trunc('day', now() at time zone ${TZ}) - (${n - 1} || ' days')::interval) at time zone ${TZ}`;
  const landing = sql`case when split_part(v.landing, '?', 1) like '/c/%' then '/c/{handle}' when split_part(v.landing, '?', 1) like '/r/%' then '/r/{invite}' else split_part(v.landing, '?', 1) end`;

  const [visits, landings, landingDaily, signups, verified, requests, deals, released, utmVisits, utmSignups, referrals, firstDeal, funnel, now] = await Promise.all([
    // 1, 2: visits and unique visitors per day; new = first time this visitor id was seen
    rows<{ day: string; visits: number; unique_visitors: number; new_visitors: number }>(sql`
      select ${day(sql`v.started_at`)} as day, count(*)::int visits, count(distinct v.visitor_id)::int unique_visitors,
        count(distinct v.visitor_id) filter (where not exists (select 1 from visits o where o.visitor_id = v.visitor_id and o.started_at < date_trunc('day', v.started_at at time zone ${TZ}) at time zone ${TZ}))::int new_visitors
      from visits v where ${HUMAN} and v.started_at >= ${since} group by 1 order by 1`),
    // 3: landing pages over the period, with the signups that started there
    rows<{ landing: string; visits: number; unique_visitors: number; signups: number }>(sql`
      select ${landing} as landing, count(*)::int visits, count(distinct v.visitor_id)::int unique_visitors,
        count(distinct v.user_id) filter (where v.user_id is not null and exists (select 1 from users u where u.id = v.user_id and ${REAL} and u.created_at between v.started_at and v.last_at + interval '5 minutes'))::int signups
      from visits v where ${HUMAN} and v.started_at >= ${since} group by 1 order by 2 desc limit 25`),
    rows<{ day: string; landing: string; visits: number }>(sql`
      select ${day(sql`v.started_at`)} as day, ${landing} as landing, count(*)::int visits from visits v where ${HUMAN} and v.started_at >= ${since} group by 1, 2 order by 1, 3 desc`),
    // 4, 5: signups per day, by side
    rows<{ day: string; total: number; buyers: number; creators: number }>(sql`
      select ${day(sql`u.created_at`)} as day, count(*)::int total, count(*) filter (where not u.is_creator)::int buyers, count(*) filter (where u.is_creator)::int creators
      from users u where ${REAL} and u.created_at >= ${since} group by 1 order by 1`),
    // 6: verified per day: creators by the ID partner (never the test provider), buyers by the age check
    rows<{ day: string; creators_id_verified: number; buyers_age_verified: number }>(sql`
      select d as day, coalesce(sum(c), 0)::int creators_id_verified, coalesce(sum(b), 0)::int buyers_age_verified from (
        select ${day(sql`coalesce(i.last_event_at, i.created_at)`)} d, count(distinct i.user_id) c, 0 b from identity_checks i join users u on u.id = i.user_id
          where ${REAL} and i.status = 'approved' and i.provider <> 'sandbox' and coalesce(i.last_event_at, i.created_at) >= ${since} group by 1
        union all select ${day(sql`u.age_verified_at`)}, 0, count(*) from users u where ${REAL} and not u.is_creator and u.age_verified_at >= ${since} group by 1) x group by 1 order by 1`),
    // 8: requests posted per day by real buyers (team requests apart)
    rows<{ day: string; by_buyers: number; by_team: number }>(sql`
      select ${day(sql`r.created_at`)} as day, count(*) filter (where u.house = false and u.internal = false)::int by_buyers, count(*) filter (where u.house)::int by_team
      from requests r join users u on u.id = r.buyer_id where r.created_at >= ${since} group by 1 order by 1`),
    // 9: deals started (creator chosen, payment held)
    rows<{ day: string; deals_started: number; value_eur: number }>(sql`
      select ${day(sql`d.created_at`)} as day, count(*)::int deals_started, round(sum(d.deal_cents) / 100.0, 2)::float value_eur
      from deals d join users u on u.id = d.buyer_id where d.created_at >= ${since} and u.internal = false group by 1 order by 1`),
    // 10, 11: completed deals and money released per day
    rows<{ day: string; deals_completed: number; gmv_eur: number; fees_eur: number; to_creators_eur: number }>(sql`
      select ${day(sql`d.settled_at`)} as day, count(*)::int deals_completed, round(sum(d.deal_cents + d.fee_cents) / 100.0, 2)::float gmv_eur,
        round(sum(d.deal_cents + d.fee_cents - d.creator_cents) / 100.0, 2)::float fees_eur, round(sum(d.creator_cents) / 100.0, 2)::float to_creators_eur
      from deals d join users u on u.id = d.buyer_id where d.status = 'released' and d.settled_at >= ${since} and u.internal = false group by 1 order by 1`),
    // 12: campaigns: visits and signups per utm combination
    rows<{ utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string; visits: number; unique_visitors: number; signups: number }>(sql`
      select coalesce(v.utm->>'utm_source', '') utm_source, coalesce(v.utm->>'utm_medium', '') utm_medium, coalesce(v.utm->>'utm_campaign', '') utm_campaign, coalesce(v.utm->>'utm_content', '') utm_content,
        count(*)::int visits, count(distinct v.visitor_id)::int unique_visitors,
        count(distinct u.id)::int signups
      from visits v left join visits w on w.visitor_id = v.visitor_id and w.user_id is not null left join users u on u.id = w.user_id and ${REAL} and u.created_at >= v.started_at
      where ${HUMAN} and v.utm is not null and v.started_at >= ${since} group by 1, 2, 3, 4 order by 5 desc limit 50`),
    rows<{ day: string; utm_source: string; utm_campaign: string; visits: number }>(sql`
      select ${day(sql`v.started_at`)} as day, coalesce(v.utm->>'utm_source', '') utm_source, coalesce(v.utm->>'utm_campaign', '') utm_campaign, count(*)::int visits
      from visits v where ${HUMAN} and v.utm is not null and v.started_at >= ${since} group by 1, 2, 3 order by 1`),
    // 12: referrals: signups through an invite link per day
    rows<{ day: string; referral_signups: number; creators: number; buyers: number }>(sql`
      select ${day(sql`r.created_at`)} as day, count(*)::int referral_signups, count(*) filter (where r.intent = 'earn')::int creators, count(*) filter (where r.intent = 'buy')::int buyers
      from referrals r join users u on u.id = r.referee_id where ${REAL} and r.created_at >= ${since} group by 1 order by 1`),
    // 13: creators whose first completed deal fell on that day
    rows<{ day: string; first_deal_creators: number }>(sql`
      select ${day(sql`f.first_at`)} as day, count(*)::int first_deal_creators from (
        select d.creator_id, min(d.settled_at) first_at from deals d join users u on u.id = d.creator_id where d.status = 'released' and ${REAL} group by 1) f
      where f.first_at >= ${since} group by 1 order by 1`),
    // 14: funnel over the period, from request to a delivery opened in the vault
    rows<{ requests_posted: number; requests_with_offer: number; deals_started: number; delivered: number; completed: number; vault_opened: number }>(sql`
      with r as (select r.id from requests r join users u on u.id = r.buyer_id where ${REAL} and r.created_at >= ${since}),
      d as (select d.* from deals d where d.request_id in (select id from r))
      select (select count(*) from r)::int requests_posted,
        (select count(*) from r where exists (select 1 from offers o where o.request_id = r.id))::int requests_with_offer,
        (select count(*) from d)::int deals_started, (select count(*) from d where d.delivered_at is not null)::int delivered,
        (select count(*) from d where d.status = 'released')::int completed,
        (select count(distinct v.deal_id) from vault_items v where v.deal_id in (select id from d) and v.views > 0)::int vault_opened`),
    // totals right now: 7 share-ready creators, 13 creators with a deal, pool size
    rows<{ creators_share_ready: number; creators_with_completed_deal: number; creators_total: number; buyers_total: number; creators_id_verified_total: number; open_requests_by_buyers: number }>(sql`
      select (select count(*) from users u join creator_onboarding o on o.user_id = u.id join creator_profiles p on p.user_id = u.id
          where ${REAL} and u.deleted_at is null and u.banned_at is null and o.identity = 'approved' and p.visibility = 'public'
          and exists (select 1 from identity_checks i where i.user_id = u.id and i.status = 'approved' and i.provider <> 'sandbox'))::int creators_share_ready,
        (select count(distinct d.creator_id) from deals d join users u on u.id = d.creator_id where d.status = 'released' and ${REAL})::int creators_with_completed_deal,
        (select count(*) from users u where ${REAL} and u.deleted_at is null and u.is_creator)::int creators_total,
        (select count(*) from users u where ${REAL} and u.deleted_at is null and not u.is_creator)::int buyers_total,
        (select count(distinct i.user_id) from identity_checks i join users u on u.id = i.user_id where ${REAL} and i.status = 'approved' and i.provider <> 'sandbox')::int creators_id_verified_total,
        (select count(*) from requests r join users u on u.id = r.buyer_id where ${REAL} and r.status = 'open' and r.closes_at > now())::int open_requests_by_buyers`),
  ]);

  // One row per day with every daily number side by side, also for quiet days.
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400_000); days.push(d.toLocaleDateString("en-CA", { timeZone: TZ })); }
  const at = <T extends { day: string },>(list: T[], d: string) => list.find((x) => x.day === d);
  const daily = days.map((d) => {
    const v = at(visits, d), s = at(signups, d), ve = at(verified, d), rq = at(requests, d), ds = at(deals, d), rl = at(released, d), rf = at(referrals, d), fd = at(firstDeal, d);
    return { day: d, visits: v?.visits ?? 0, unique_visitors: v?.unique_visitors ?? 0, new_visitors: v?.new_visitors ?? 0, returning_visitors: (v?.unique_visitors ?? 0) - (v?.new_visitors ?? 0),
      signups: s?.total ?? 0, signups_buyers: s?.buyers ?? 0, signups_creators: s?.creators ?? 0, referral_signups: rf?.referral_signups ?? 0,
      creators_id_verified: ve?.creators_id_verified ?? 0, buyers_age_verified: ve?.buyers_age_verified ?? 0,
      requests_by_buyers: rq?.by_buyers ?? 0, requests_by_team: rq?.by_team ?? 0, deals_started: ds?.deals_started ?? 0, deals_started_value_eur: ds?.value_eur ?? 0,
      deals_completed: rl?.deals_completed ?? 0, gmv_eur: rl?.gmv_eur ?? 0, platform_fees_eur: rl?.fees_eur ?? 0, paid_to_creators_eur: rl?.to_creators_eur ?? 0,
      creators_first_completed_deal: fd?.first_deal_creators ?? 0,
      landing: landingDaily.filter((x) => x.day === d).map(({ landing, visits }) => ({ landing, visits })),
      campaigns: utmSignups.filter((x) => x.day === d).map(({ utm_source, utm_campaign, visits }) => ({ utm_source, utm_campaign, visits })) };
  });
  return {
    generated_at: new Date().toISOString(), timezone: TZ, period_days: n, from: days[0], to: days[days.length - 1],
    now: now[0], funnel_period: funnel[0], landing_pages_period: landings, campaigns_period: utmVisits, daily,
    notes: [
      "Team accounts, ByRequest team profiles and automated visits from data centres are left out.",
      "Visitors who did not accept cookies get a new anonymous id every day, so returning_visitors only counts people who accepted cookies or signed in.",
      "Signups by side: creators are accounts that started the creator setup; everyone else is a buyer.",
      "creators_id_verified counts only checks by the real verification partner, never the test provider.",
      "gmv_eur is the buyer price plus service fee of completed deals; payments are not live with a payment partner yet.",
      "Campaign signups are attributed when the same browser signed up after a visit with those utm tags.",
    ],
  };
}
