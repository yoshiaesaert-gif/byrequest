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

/* Share bonus. Every new member who joins through someone's link AND passes the ID check (creator) or age check
   (buyer) earns the inviter a fixed amount (€20), after a staff member approves it. Only verified people count: one
   ID is one person, so second accounts, VPNs and fake profiles never add up. Every step lands in the inviter's inbox. */
const { shareBonuses: SB, users: U, referralEvents: E, walletEntries: W, notifications: N } = schema;
export const LEVELS = [1, 3, 5, 10, 25, 50];

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
  const refs = await db.select({ id: schema.referrals.refereeId }).from(schema.referrals).where(eq(schema.referrals.referrerId, userId));
  let verified = 0, pending = 0;
  for (const r of refs) { const c = await counts(r.id, userId); if (c === "verified") verified++; else if (c === "pending") pending++; }
  const rows = await db.select({ status: SB.status, cents: SB.cents }).from(SB).where(eq(SB.referrerId, userId));
  const paid = rows.filter((r) => r.status === "approved");
  const level = LEVELS.filter((x) => verified >= x).length;
  return { on: cfg.shareOn, cents: cfg.shareCents, verified, pending, level, next: LEVELS.find((x) => verified < x) ?? verified + 10,
    ready: rows.filter((r) => r.status === "ready").length, paidCents: paid.reduce((n, r) => n + r.cents, 0) };
}

/* A new account came in through a link (called right after the referral is made). */
export async function shareOnSignup(referrerId: string, refereeId: string, code: string) {
  const cfg = await getConfig();
  if (!cfg.shareOn) return;
  const [b] = await db.insert(SB).values({ referrerId, refereeId, code, cents: cfg.shareCents }).onConflictDoNothing().returning({ id: SB.id });
  if (b) await say(referrerId, "🎉 A new member joined through your link! As soon as they pass their ID check, {amount} is yours. Tip: tell them it takes two minutes.", { amount: euros(cfg.shareCents) });
}

/* Runs every minute: a verified new member moves to the approval queue; a closed one drops out. Level ups get a message. */
export async function shareSweep() {
  // Members who joined through a link before every sign up got a bonus line: add theirs, quietly.
  const cfg = await getConfig();
  if (cfg.shareOn) await db.execute(sql`insert into share_bonuses (referrer_id, referee_id, code, cents)
    select r.referrer_id, r.referee_id, r.code, ${cfg.shareCents} from referrals r
    where r.created_at > '2026-11-02' and not exists (select 1 from share_bonuses b where b.referee_id = r.referee_id)
    on conflict do nothing`);
  for (const b of await db.select().from(SB).where(eq(SB.status, "waiting")).limit(200)) {
    const c = await counts(b.refereeId, b.referrerId);
    if (c === "closed") { await db.update(SB).set({ status: "rejected", decidedAt: new Date(), decidedBy: "system", note: "Account closed or the same person" }).where(and(eq(SB.id, b.id), eq(SB.status, "waiting"))); continue; }
    if (c !== "verified") continue;
    const [moved] = await db.update(SB).set({ status: "ready", readyAt: new Date() }).where(and(eq(SB.id, b.id), eq(SB.status, "waiting"))).returning({ id: SB.id });
    if (!moved) continue;
    const p = await shareProgress(b.referrerId);
    const done = new Set((await db.select({ d: E.detail }).from(E).where(and(eq(E.code, b.code), eq(E.event, "share_level")))).map((r) => Number((r.d as { n: number }).n)));
    const hit = LEVELS.filter((x) => p.verified >= x && !done.has(x));
    if (hit.length) await db.insert(E).values(hit.map((n) => ({ code: b.code, event: "share_level", detail: { n } })));
    await say(b.referrerId, hit.length ? "🏆 Level {level}! {n} verified members through your link. Our team is confirming your {amount} now." : "✅ A member you brought in is verified. Our team is confirming your {amount} now.", { level: p.level, n: p.verified, amount: euros(b.cents) });
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

/* The bar and the header button. */
export async function barData(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(U.id, userId), columns: { refCode: true } });
  return { ...(await shareProgress(userId)), code: u?.refCode ?? null };
}
