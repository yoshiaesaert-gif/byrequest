"use server";
import { LOOKS } from "@/domain/looks";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { cookies } from "next/headers";
import { acceptDocs, ensure } from "@/server/onboarding";
import { BUYER_COUNTRIES } from "@/config/compliance";
import { RuleError } from "@/domain/rules";
import { getLocale } from "@/i18n/server";
import { attach } from "@/server/referrals";
import { REF_COOKIE } from "@/domain/referral";
import { issueCode, verifyCode, startSession, endSession, currentUser, markVerified, verifiedEmail, clearVerified } from "@/server/auth";

export type AuthState = { step: "email" | "code" | "profile" | "blocked"; email?: string; devCode?: string | null; error?: string; reason?: string; sent?: boolean };

const Email = z.string().trim().toLowerCase().email();

export async function sendCode(_: AuthState, f: FormData): Promise<AuthState> {
  const e = Email.safeParse(f.get("email"));
  if (!e.success) return { step: "email", error: "Enter a valid email address." };
  try {
    const { code } = await issueCode(e.data, await getLocale());
    return { step: "code", email: e.data, devCode: code };
  } catch (err) {
    if (err instanceof RuleError) return { step: "email", error: err.message };
    console.error("sign in code failed", err instanceof Error ? err.message : "error");
    return { step: "email", error: "We could not send the code. Try again in a minute." };
  }
}

export async function checkCode(prev: AuthState, f: FormData): Promise<AuthState> {
  const e = Email.safeParse(f.get("email"));
  if (!e.success) return { step: "email", error: "Start again with your email." };
  const email = e.data;
  const ok = await verifyCode(email, String(f.get("code") ?? "").replace(/\D/g, ""));   // a pasted "232 330" or "232-330" works too
  if (!ok) return { ...prev, error: "That code is not right or has expired." };
  const u = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (u?.bannedAt) {
    // The person proved they own the address, so they may read the reason and appeal (DSA art. 17 and 20).
    await markVerified(email);
    const d = await db.query.decisions.findFirst({ where: eq(schema.decisions.userId, u.id), orderBy: desc(schema.decisions.createdAt) });
    return { step: "blocked", email, reason: d ? `${d.facts} Scope: ${d.scope}` : u.banReason ?? "This account was closed." };
  }
  if (u) { await startSession(u.id); redirect("/"); }
  await markVerified(email);
  return { step: "profile", email };
}

const Profile = z.object({
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9._]{3,20}$/, "3 to 20 letters, numbers, dots or underscores."),
  birthYear: z.coerce.number().int(),
  adult: z.literal("on", { message: "You must confirm you are 18 or older and accept the terms." }),
  sensitive: z.literal("on", { message: "We need your explicit consent to handle requests and chats about intimate content." }),
  country: z.enum(BUYER_COUNTRIES.map(([c]) => c) as [string, ...string[]], { message: "Choose your country." }),
  marketing: z.literal("on").optional(),
  look: z.string().refine((l) => LOOKS.includes(l), "Pick one of the avatars.").default("kai"),
  intent: z.enum(["buy", "earn"], { message: "Choose what you want to do on ByRequest." }),
});

export async function createAccount(prev: AuthState, f: FormData): Promise<AuthState> {
  const email = await verifiedEmail();
  if (!email) return { step: "profile", error: "Your code expired. Start again." };
  const p = Profile.safeParse(Object.fromEntries(f));
  if (!p.success) return { ...prev, error: p.error.issues[0].message };
  const age = new Date().getFullYear() - p.data.birthYear;
  if (age < 18 || age > 110) return { ...prev, error: "ByRequest is for adults only." };
  const taken = await db.query.users.findFirst({ where: eq(schema.users.handle, p.data.handle) });
  if (taken) return { ...prev, error: "That username is taken." };
  const [u] = await db.insert(schema.users).values({
    email, handle: p.data.handle, birthYear: p.data.birthYear, avatar: { kind: "3d", look: p.data.look },
    country: p.data.country, sensitiveConsentAt: new Date(), marketingOptIn: p.data.marketing === "on",
  }).returning();
  // The checkbox records acceptance of the exact current terms and privacy statement (version and hash).
  await acceptDocs(u.id, ["terms", "privacy"]);
  // Invited: the code from the invite link (cookie) or typed in at sign up ties the account to a friend.
  const jar = await cookies();
  await attach(u.id, String(f.get("ref") ?? "").trim() || jar.get(REF_COOKIE)?.value, p.data.intent).catch((e) => console.error("referral attach failed", e instanceof Error ? e.message : e));
  jar.delete(REF_COOKIE);
  await clearVerified();
  await startSession(u.id);
  // Two different starts: buyers land on the board with their welcome tour, earners go straight into creator setup.
  if (p.data.intent === "earn") {
    await ensure(u.id);
    await db.insert(schema.creatorProfiles).values({ userId: u.id }).onConflictDoNothing();
    (await cookies()).set("brq_mode", "sell", { path: "/", sameSite: "lax", maxAge: 31536000 });
    redirect("/onboarding?welcome=1");
  }
  redirect("/?welcome=1");
}

/* Step 2 of the sign up wizard: is this username valid and still free? Only after the email code. */
export async function handleFree(raw: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await verifiedEmail())) return { ok: false, error: "Your code expired. Start again." };
  const h = Profile.shape.handle.safeParse(raw);
  if (!h.success) return { ok: false, error: h.error.issues[0].message };
  const taken = await db.query.users.findFirst({ where: eq(schema.users.handle, h.data), columns: { id: true } });
  return taken ? { ok: false, error: "That username is taken." } : { ok: true };
}

/* Development shortcut: sign in as a seeded demo account without email. Disabled in production. */
export async function demoSignIn(handle: string) {
  if (process.env.DEV_SHOW_CODE !== "1") throw new Error("Not available.");
  const u = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  if (!u || !u.email.endsWith("@demo.byrequest.app")) throw new Error("Only seeded demo accounts. Run npm run db:seed first.");
  if (await db.query.staff.findFirst({ where: eq(schema.staff.userId, u.id) })) throw new Error("Not available.");
  await startSession(u.id);
  redirect("/");
}

export async function signOut() {
  await endSession();
  redirect("/signin");
}

export async function whoami() { return (await currentUser())?.handle ?? null; }

/* Appeal from a closed account. Only after the email code, so nobody can appeal for someone else. */
export async function appealClosed(prev: AuthState, f: FormData): Promise<AuthState> {
  const email = await verifiedEmail();
  if (!email) return { ...prev, error: "Your code expired. Start again." };
  const u = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  const msg = String(f.get("msg") ?? "").trim();
  if (!u?.bannedAt || msg.length < 10) return { ...prev, error: "Explain in a few words why you disagree." };
  const d = await db.query.decisions.findFirst({ where: eq(schema.decisions.userId, u.id), orderBy: desc(schema.decisions.createdAt) });
  await db.insert(schema.appeals).values({ userId: u.id, area: "account", message: msg.slice(0, 1000), decisionId: d?.id ?? null });
  await db.insert(schema.audit).values({ actor: `user:${u.id}`, action: "appeal.filed", subjectUserId: u.id, detail: { area: "account" } });
  await clearVerified();
  return { ...prev, sent: true, error: undefined };
}
