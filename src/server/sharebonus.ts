import "server-only";
import { and, desc, eq, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { DICTS } from "@/i18n/dicts";
import { isLocale, translator } from "@/i18n/config";
import { RuleError } from "@/domain/rules";
import { euros } from "@/domain/rules";
import { getConfig, netId } from "./referrals";
import { parseUa } from "./analytics";
import { log } from "./onboarding";
import { TEAM_HREF } from "./queries";

/* Share bonus. Once someone's invite link was opened by enough different people (25 by default), every account
   made through that link earns them a fixed amount (€20). It is paid only after the new account is verified
   (ID check for a creator, age check for a buyer) AND a staff member approves it. Every step lands as a message in
   the inviter's ByRequest inbox, so they feel it move. */
const { shareBonuses: SB, users: U, visits: V, visitEvents: VE, referralEvents: E, walletEntries: W, notifications: N } = schema;

/* Different people who opened the link: by network and device, never counting the owner. */
export async function peopleReached(code: string, ownerId: string) {
  const mine = new Set((await db.selectDistinct({ ip: V.ip }).from(V).where(and(eq(V.userId, ownerId), isNotNull(V.ip)))).map((r) => r.ip!));
  const keys = new Set<string>();
  const vs = await db.selectDistinct({ ip: V.ip, os: V.os, browser: V.browser, userId: V.userId }).from(V).leftJoin(VE, eq(VE.visitId, V.id))
    .where(and(eq(V.bot, false), sql`(${V.refCode} = ${code} or ${VE.path} like ${"%ref=" + code + "%"})`));
  for (const v of vs) if (v.ip && !mine.has(v.ip) && v.userId !== ownerId) keys.add(`${netId(v.ip)}|${v.os}|${v.browser}`);
  const evs = await db.select({ d: E.detail }).from(E).where(and(eq(E.code, code), eq(E.event, "link_opened"), sql`${E.detail}->>'who' = 'person'`));
  for (const e of evs) { const d = e.d as Record<string, string>; if (d.net) keys.add(`${d.net}|${d.os}|${d.browser}`); }
  return keys.size;
}

async function say(userId: string, text: string, vars?: Record<string, string | number>) {
  const u = await db.query.users.findFirst({ where: eq(U.id, userId), columns: { lang: true } });
  const lang = u?.lang ?? "";
  const t = translator(DICTS[isLocale(lang) ? lang : "en"]);
  await db.insert(N).values({ userId, title: "ByRequest", body: t(text, vars), href: TEAM_HREF });
}

async function verified(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(U.id, userId), columns: { ageVerifiedAt: true } });
  if (u?.ageVerifiedAt) return true;
  const [c] = await db.select({ x: sql`1` }).from(schema.identityChecks).where(and(eq(schema.identityChecks.userId, userId), eq(schema.identityChecks.status, "approved"), ne(schema.identityChecks.provider, "sandbox"))).limit(1);
  return !!c;
}

/* Everything the invite page shows about the bonus. */
export async function shareProgress(userId: string, code: string | null) {
  const cfg = await getConfig();
  const people = code ? await peopleReached(code, userId) : 0;
  const rows = await db.select({ status: SB.status, cents: SB.cents }).from(SB).where(eq(SB.referrerId, userId));
  const sum = (s: string) => rows.filter((r) => r.status === s);
  return { on: cfg.shareOn, goal: cfg.sharePeople, cents: cfg.shareCents, people, unlocked: people >= cfg.sharePeople,
    waiting: sum("waiting").length, ready: sum("ready").length, paid: sum("approved").length, paidCents: sum("approved").reduce((n, r) => n + r.cents, 0) };
}

/* A new account came in through a link (called right after the referral is made). */
export async function shareOnSignup(referrerId: string, refereeId: string, code: string) {
  const cfg = await getConfig();
  if (!cfg.shareOn) return;
  const people = await peopleReached(code, referrerId);
  if (people >= cfg.sharePeople) {
    const [b] = await db.insert(SB).values({ referrerId, refereeId, code, cents: cfg.shareCents }).onConflictDoNothing().returning({ id: SB.id });
    if (b) await say(referrerId, "🎉 Ka-ching! A new account was made through your link. Your {amount} is reserved and comes your way as soon as they verify their account.", { amount: euros(cfg.shareCents) });
  } else {
    await say(referrerId, "🎉 A new account was made through your link! Reach {left} more people and every new account earns you {amount} cash.", { left: cfg.sharePeople - people, amount: euros(cfg.shareCents) });
  }
}

const MILESTONES = [5, 10, 15, 20];

/* Runs every minute: moves verified accounts to the approval queue and tells inviters how far their link got. */
export async function shareSweep() {
  const cfg = await getConfig();
  for (const b of await db.select().from(SB).where(eq(SB.status, "waiting")).limit(200)) {
    if (!(await verified(b.refereeId))) continue;
    const [moved] = await db.update(SB).set({ status: "ready", readyAt: new Date() }).where(and(eq(SB.id, b.id), eq(SB.status, "waiting"))).returning({ id: SB.id });
    if (moved) await say(b.referrerId, "✅ The account you brought in is verified. Our team is confirming your {amount} now, you will see it on your balance soon.", { amount: euros(b.cents) });
  }
  if (!cfg.shareOn) return;
  // Links opened in the last two days: did they pass a milestone or the goal?
  const recent = await db.selectDistinct({ code: E.code }).from(E).where(and(eq(E.event, "link_opened"), gt(E.createdAt, new Date(Date.now() - 2 * 86400_000))));
  if (!recent.length) return;
  const owners = await db.select({ id: U.id, code: U.refCode }).from(U).where(inArray(U.refCode, recent.map((r) => r.code)));
  for (const o of owners) {
    const people = await peopleReached(o.code!, o.id);
    const done = new Set((await db.select({ d: E.detail }).from(E).where(and(eq(E.code, o.code!), eq(E.event, "share_milestone")))).map((r) => Number((r.d as { n: number }).n)));
    const goal = cfg.sharePeople;
    const hit = [...MILESTONES.filter((m) => m < goal), goal - 1, goal].filter((m, i, a) => m > 0 && a.indexOf(m) === i && people >= m && !done.has(m));
    if (!hit.length) continue;
    const top = Math.max(...hit);
    await db.insert(E).values(hit.map((n) => ({ code: o.code!, event: "share_milestone", detail: { n, people } })));
    if (top >= goal) await say(o.id, "🔓 UNLOCKED! Your link reached {goal} different people. From now on, every new account made through your link earns you {amount} cash. Keep sharing!", { goal, amount: euros(cfg.shareCents) });
    else if (top === goal - 1) await say(o.id, "🔥 Just 1 more person! Your link reached {n} people. One more and every new account earns you {amount} cash.", { n: people, amount: euros(cfg.shareCents) });
    else await say(o.id, "🚀 Your link reached {n} different people! {left} more to unlock {amount} cash for every new account. Keep it going!", { n: people, left: goal - people, amount: euros(cfg.shareCents) });
  }
}

/* Staff: the queue, and the decision. Approving puts the money on the inviter's balance. */
export async function shareQueue() {
  const R = schema.users;
  return db.select({ b: SB, inviter: sql<string>`(select handle from users where id = ${SB.referrerId})`, friend: R.handle, friendCreated: R.createdAt, creator: R.isCreator })
    .from(SB).innerJoin(R, eq(R.id, SB.refereeId)).orderBy(desc(SB.createdAt)).limit(200);
}

export async function shareDecide(staffId: string, id: string, ok: boolean, note = "") {
  const b = await db.query.shareBonuses.findFirst({ where: eq(SB.id, id) });
  if (!b) throw new RuleError("This bonus no longer exists.");
  if (b.status === "approved" || b.status === "rejected") throw new RuleError("This bonus was already decided.");
  if (ok && b.status !== "ready") throw new RuleError("The new account is not verified yet.");
  await db.transaction(async (tx) => {
    const [d] = await tx.update(SB).set({ status: ok ? "approved" : "rejected", decidedAt: new Date(), decidedBy: staffId, note: note.slice(0, 300) || null }).where(and(eq(SB.id, id), eq(SB.status, b.status))).returning({ id: SB.id });
    if (!d) throw new RuleError("Someone else just decided this bonus.");
    if (ok) await tx.insert(W).values({ userId: b.referrerId, kind: "share_bonus", cents: b.cents, ref: b.id });
    await log(tx, staffId, ok ? "referral.share_bonus_approved" : "referral.share_bonus_rejected", b.referrerId, { bonus: b.id, cents: b.cents, friend: b.refereeId, note });
  });
  if (ok) await say(b.referrerId, "💸 {amount} is on your balance! Thanks for spreading ByRequest. Every new account through your link brings you another {amount}.", { amount: euros(b.cents) });
  else await say(b.referrerId, "A share bonus could not be given for one of the accounts made through your link. Questions? Just reply here.");
}

/* The slim bar on every page: how far the link got, and what it would have paid already. */
export async function barData(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(U.id, userId), columns: { refCode: true } });
  const p = await shareProgress(userId, u?.refCode ?? null);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.referrals).where(eq(schema.referrals.referrerId, userId));
  const extra = Number(((await db.query.settings.findFirst({ where: eq(schema.settings.key, "ref_display_extra") }))?.value as Record<string, number> | undefined)?.[userId] ?? 0) || 0;
  return { ...p, joined: n + extra, code: u?.refCode ?? null };
}
