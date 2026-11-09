import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { DICTS } from "@/i18n/dicts";
import { isLocale, translator } from "@/i18n/config";
import { RuleError } from "@/domain/rules";
import { euros } from "@/domain/rules";
import { getConfig } from "./referrals";
import { log } from "./onboarding";
import { TEAM_HREF } from "./queries";

/* Share bonus. A member counts once they joined through someone's link AND passed the ID check (creator) or age
   check (buyer); one ID is one person. The first 20 verified members only count (the threshold). Members 21 to 30
   each earn the inviter €20, after a staff member approves it. Both numbers are settings. Every step lands in the
   inviter's inbox. */
const { shareBonuses: SB, users: U, referralEvents: E, walletEntries: W, notifications: N } = schema;
export const LEVELS = [5, 10, 15, 20, 25, 30];

async function say(userId: string, text: string, vars?: Record<string, string | number>) {
  const u = await db.query.users.findFirst({ where: eq(U.id, userId), columns: { lang: true } });
  const lang = u?.lang ?? "";
  const t = translator(DICTS[isLocale(lang) ? lang : "en"]);
  await db.insert(N).values({ userId, title: "ByRequest", body: t(text, vars), href: TEAM_HREF });
}

/* Verified and still open, and not the same person as the inviter. */
async function counts(refereeId: string, referrerId: string) {
  const [u, r] = await Promise.all([
    db.query.users.findFirst({ where: eq(U.id, refereeId), columns: { ageVerifiedAt: true, bannedAt: true, deletedAt: true, idFingerprint: true } }),
    db.query.users.findFirst({ where: eq(U.id, referrerId), columns: { idFingerprint: true } }),
  ]);
  if (!u || u.bannedAt || u.deletedAt) return "closed" as const;
  if (u.idFingerprint && r?.idFingerprint && u.idFingerprint === r.idFingerprint) return "closed" as const;
  if (u.ageVerifiedAt) return "verified" as const;
  const [c] = await db.select({ x: sql`1` }).from(schema.identityChecks).where(and(eq(schema.identityChecks.userId, refereeId), eq(schema.identityChecks.status, "approved"), ne(schema.identityChecks.provider, "sandbox"))).limit(1);
  return c ? "verified" as const : "pending" as const;
}

/* Everything the invite page and the bar show. */
export async function shareProgress(userId: string) {
  const cfg = await getConfig();
  const rows = await db.select({ status: SB.status, cents: SB.cents }).from(SB).where(eq(SB.referrerId, userId));
  const verified = rows.filter((r) => r.status === "counted" || r.status === "ready" || r.status === "approved").length;
  const pending = rows.filter((r) => r.status === "waiting").length;
  const free = cfg.sharePeople, max = cfg.shareMax;
  const paid = rows.filter((r) => r.status === "approved");
  return { on: cfg.shareOn, cents: cfg.shareCents, free, max, verified, pending, unlocked: verified >= free, left: Math.max(0, free - verified),
    slots: Math.max(0, max - Math.max(verified, free)), ready: rows.filter((r) => r.status === "ready").length, paidCents: paid.reduce((n, r) => n + r.cents, 0),
    level: LEVELS.filter((x) => verified >= x).length, next: LEVELS.find((x) => verified < x) ?? max };
}

/* A new account came in through a link (called right after the referral is made). */
export async function shareOnSignup(referrerId: string, refereeId: string, code: string) {
  const cfg = await getConfig();
  if (!cfg.shareOn) return;
  const [b] = await db.insert(SB).values({ referrerId, refereeId, code, cents: cfg.shareCents }).onConflictDoNothing().returning({ id: SB.id });
  if (b) await say(referrerId, "🎉 A new member joined through your link! As soon as they pass their ID check, they count for your bonus. Tip: tell them it takes two minutes.");
}

/* Puts every verified member of one inviter in order and decides which ones pay: numbers above the threshold up to the cap.
   Approved and rejected lines never change. Returns how many verified members there are. */
async function rank(referrerId: string) {
  const cfg = await getConfig();
  const rows = await db.select().from(SB).where(and(eq(SB.referrerId, referrerId), ne(SB.status, "rejected"))).orderBy(SB.readyAt, SB.createdAt);
  let n = 0;
  for (const b of rows) {
    if (b.status === "waiting") continue;
    n++;
    if (b.status === "approved") continue;
    const want = n > cfg.sharePeople && n <= cfg.shareMax ? "ready" : "counted";
    if (b.status !== want) await db.update(SB).set({ status: want }).where(eq(SB.id, b.id));
  }
  return { n };
}

/* Runs every minute: a verified member gets their number; a closed one drops out. Every step gets a message. */
export async function shareSweep() {
  const cfg = await getConfig();
  if (cfg.shareOn) await db.execute(sql`insert into share_bonuses (referrer_id, referee_id, code, cents)
    select r.referrer_id, r.referee_id, r.code, ${cfg.shareCents} from referrals r
    where r.created_at > '2026-11-02' and not exists (select 1 from share_bonuses b where b.referee_id = r.referee_id)
    on conflict do nothing`);
  const touched = new Set<string>();
  for (const b of await db.select().from(SB).where(eq(SB.status, "waiting")).limit(200)) {
    const c = await counts(b.refereeId, b.referrerId);
    if (c === "closed") { await db.update(SB).set({ status: "rejected", decidedAt: new Date(), decidedBy: "system", note: "Account closed or the same person" }).where(and(eq(SB.id, b.id), eq(SB.status, "waiting"))); continue; }
    if (c !== "verified") continue;
    const [moved] = await db.update(SB).set({ status: "counted", readyAt: new Date() }).where(and(eq(SB.id, b.id), eq(SB.status, "waiting"))).returning({ id: SB.id });
    if (!moved) continue;
    const { n } = await rank(b.referrerId); touched.add(b.referrerId);
    const amount = euros(cfg.shareCents);
    if (n < cfg.sharePeople) await say(b.referrerId, "✅ {n} of {free} verified members through your link. {left} more and from number {start} on, every verified member earns you {amount}.", { n, free: cfg.sharePeople, left: cfg.sharePeople - n, start: cfg.sharePeople + 1, amount });
    else if (n === cfg.sharePeople) await say(b.referrerId, "🔓 UNLOCKED! {n} verified members through your link. From now on every new verified member earns you {amount}, up to number {max}.", { n, amount, max: cfg.shareMax });
    else if (n <= cfg.shareMax) await say(b.referrerId, "💸 Member number {n} is verified: {amount} for you. Our team is confirming it now. Still {slots} paid places left.", { n, amount, slots: cfg.shareMax - n });
    else await say(b.referrerId, "🏆 {n} verified members through your link. You used every paid place. Thank you for growing ByRequest!", { n });
  }
  // Settings or older lines: keep every inviter's order right.
  const others = await db.selectDistinct({ id: SB.referrerId }).from(SB).where(sql`${SB.status} in ('ready', 'counted')`);
  for (const o of others) if (!touched.has(o.id)) await rank(o.id);
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

/* The bar and the header button. */
export async function barData(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(U.id, userId), columns: { refCode: true } });
  return { ...(await shareProgress(userId)), code: u?.refCode ?? null };
}
