import "server-only";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { db, schema } from "@/db";
import { parseUa } from "./analytics";
import { TEAM_HREF } from "./queries";
import { DICTS } from "@/i18n/dicts";
import { isLocale, translator } from "@/i18n/config";

/* One account per person. Two checks:
   1. At sign up: this browser was used by an existing account (device cookie), or the same network and the same
      phone and browser were signed in to an account in the last 30 days. Then no new account; log in instead.
   2. After the ID check: the verified name and birth date match another account. Then the new account is closed. */
const { users: U, visits: V } = schema;
export const DEVICE_COOKIE = "brq_dev";

export async function rememberDevice(userId: string) {
  (await cookies()).set(DEVICE_COOKIE, userId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 2 * 365 * 86400 });
}

/* The existing account on this device, if any. Team accounts never block (staff test on their own phones). */
export async function accountOnDevice(): Promise<{ id: string; handle: string; how: string } | null> {
  const jar = await cookies();
  const h = await headers();
  const dev = jar.get(DEVICE_COOKIE)?.value;
  if (dev && /^[0-9a-f-]{36}$/.test(dev)) {
    const u = await db.query.users.findFirst({ where: and(eq(U.id, dev), isNull(U.deletedAt)), columns: { id: true, handle: true, internal: true } });
    if (u && !u.internal) return { id: u.id, handle: u.handle, how: "device" };
  }
  const ip = (h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim();
  if (!ip) return null;
  const { device, os, browser } = parseUa(h.get("user-agent") ?? "");
  const [v] = await db.select({ id: U.id, handle: U.handle }).from(V).innerJoin(U, eq(U.id, V.userId))
    .where(and(eq(V.ip, ip), eq(V.os, os), eq(V.browser, browser), eq(V.device, device), gt(V.startedAt, new Date(Date.now() - 30 * 86400_000)), isNull(U.deletedAt), eq(U.internal, false), eq(U.house, false)))
    .orderBy(desc(V.startedAt)).limit(1);
  return v ? { ...v, how: "same network and device" } : null;
}

async function say(userId: string, text: string) {
  const u = await db.query.users.findFirst({ where: eq(U.id, userId), columns: { lang: true } });
  const lang = u?.lang ?? "";
  await db.insert(schema.notifications).values({ userId, title: "ByRequest", body: translator(DICTS[isLocale(lang) ? lang : "en"])(text), href: TEAM_HREF });
}

/* A blocked attempt: logged for staff, and the existing account hears it (at most once an hour). */
export async function blockedAttempt(existing: { id: string; handle: string; how: string }, email: string) {
  await db.insert(schema.audit).values({ actor: "system", action: "signup.second_account_blocked", subjectUserId: existing.id, detail: { how: existing.how, emailDomain: email.split("@")[1] ?? "" } });
  const [recent] = await db.select({ x: sql`1` }).from(schema.audit).where(and(eq(schema.audit.subjectUserId, existing.id), eq(schema.audit.action, "signup.second_account_notice"), gt(schema.audit.at, new Date(Date.now() - 3600_000)))).limit(1);
  if (recent) return;
  await db.insert(schema.audit).values({ actor: "system", action: "signup.second_account_notice", subjectUserId: existing.id, detail: {} });
  await say(existing.id, "We noticed an attempt to make a second ByRequest account on your phone. Only one account per person is allowed, so it was stopped. Keep using your own account. Want to earn more? Share your link with other people: every real new person counts.");
}

const norm = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
export function idFingerprint(name?: string, dob?: string) {
  if (!name || !dob) return null;
  return createHash("sha256").update(`${norm(name)}|${dob.slice(0, 10)}|${process.env.SESSION_SECRET ?? ""}`).digest("hex").slice(0, 40);
}
