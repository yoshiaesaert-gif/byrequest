import "server-only";
import { cookies, headers } from "next/headers";
import { mailReady, sendLoginCode, staffMailReady } from "./mail";
import { RuleError } from "@/domain/rules";
import { redirect } from "next/navigation";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";

const COOKIE = "brq_s";
const DAYS = 30;
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set.");
  return s || "dev";
};
const hmac = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");

/* Limits on asking for codes, per address and per network address, so nobody can flood an inbox
   or try codes at scale. One instance runs the app, so memory is enough. */
const hits = new Map<string, number[]>();
function allow(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) { hits.set(key, list); return false; }
  list.push(now); hits.set(key, list);
  if (hits.size > 50_000) hits.clear();
  return true;
}

/* The code is shown on screen only in a demo without a mail provider. With mail configured the code
   only ever travels by email. */
export const showCodeOnScreen = () => process.env.DEV_SHOW_CODE === "1" && !mailReady();

/* Passwordless: a six digit code by email. Codes are stored hashed, expire after 10 minutes
   and allow five attempts. */
export async function issueCode(emailRaw: string, locale = "en") {
  const email = emailRaw.trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(`e:${email}`, 5, 15 * 60_000) || !allow(`i:${ip}`, 20, 60 * 60_000)) throw new RuleError("Too many codes asked. Wait a few minutes and try again.");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row = { email, codeHash: hmac(email + ":" + code), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60_000) };
  await db.insert(schema.loginCodes).values(row).onConflictDoUpdate({ target: schema.loginCodes.email, set: row });
  // Staff accounts have full control: their code only ever travels by mail, never on screen.
  const u = await db.query.users.findFirst({ where: eq(schema.users.email, email), columns: { id: true } });
  if (u && (await db.query.staff.findFirst({ where: eq(schema.staff.userId, u.id) }))) {
    if (!staffMailReady()) throw new RuleError("Sign in by mail is not available yet. Try again later.");
    await sendLoginCode(email, code, locale);
    return { email, code: null };
  }
  if (mailReady()) await sendLoginCode(email, code, locale);
  else if (!showCodeOnScreen()) console.warn("[mail] no mail provider configured: set RESEND_API_KEY so people can sign in");
  return { email, code: showCodeOnScreen() ? code : null };
}

export async function verifyCode(emailRaw: string, code: string) {
  const email = emailRaw.trim().toLowerCase();
  const row = await db.query.loginCodes.findFirst({ where: eq(schema.loginCodes.email, email) });
  if (!row || row.expiresAt < new Date() || row.attempts >= 5) return false;
  const a = Buffer.from(row.codeHash), b = Buffer.from(hmac(email + ":" + code.trim()));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.update(schema.loginCodes).set({ attempts: row.attempts + 1 }).where(eq(schema.loginCodes.email, email));
    return false;
  }
  await db.delete(schema.loginCodes).where(eq(schema.loginCodes.email, email));
  return true;
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DAYS * 86400_000);
  await db.insert(schema.sessions).values({ tokenHash: sha(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function endSession() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha(t)));
  jar.delete(COOKIE);
}

export async function currentUser() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const s = await db.query.sessions.findFirst({ where: and(eq(schema.sessions.tokenHash, sha(t)), gt(schema.sessions.expiresAt, new Date())) });
  if (!s) return null;
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, s.userId) });
  return u && !u.bannedAt ? u : null;
}

/* Sensitive changes such as payout details need a fresh email code in the last few minutes. */
export async function stepUpFresh(minutes: number) {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return false;
  const s = await db.query.sessions.findFirst({ where: eq(schema.sessions.tokenHash, sha(t)) });
  return !!s?.stepUpAt && Date.now() - s.stepUpAt.getTime() < minutes * 60_000;
}
export async function markStepUp() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (t) await db.update(schema.sessions).set({ stepUpAt: new Date() }).where(eq(schema.sessions.tokenHash, sha(t)));
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/signin");
  return u;
}

export async function requireCreator() {
  const u = await requireUser();
  if (!u.isCreator) redirect("/settings?become=creator");
  return u;
}

/* After a correct code for an unknown email, a short signed cookie proves the email was verified
   until the account is created. Nothing from the form itself is trusted. */
export async function markVerified(email: string) {
  const exp = Date.now() + 15 * 60_000;
  (await cookies()).set("brq_v", `${email}|${exp}|${hmac(email + "|" + exp)}`, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 900 });
}
export async function verifiedEmail() {
  const v = (await cookies()).get("brq_v")?.value;
  if (!v) return null;
  const [email, exp, sig] = v.split("|");
  if (!email || Number(exp) < Date.now()) return null;
  const a = Buffer.from(sig ?? ""), b = Buffer.from(hmac(email + "|" + exp));
  return a.length === b.length && timingSafeEqual(a, b) ? email : null;
}
export async function clearVerified() { (await cookies()).delete("brq_v"); }

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
export type User = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
