"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { issueCode, verifyCode, startSession, endSession, currentUser, markVerified, verifiedEmail, clearVerified } from "@/server/auth";

export type AuthState = { step: "email" | "code" | "profile"; email?: string; devCode?: string | null; error?: string };

const Email = z.string().trim().toLowerCase().email();

export async function sendCode(_: AuthState, f: FormData): Promise<AuthState> {
  const e = Email.safeParse(f.get("email"));
  if (!e.success) return { step: "email", error: "Enter a valid email address." };
  const { code } = await issueCode(e.data);
  return { step: "code", email: e.data, devCode: code };
}

export async function checkCode(prev: AuthState, f: FormData): Promise<AuthState> {
  const e = Email.safeParse(f.get("email"));
  if (!e.success) return { step: "email", error: "Start again with your email." };
  const email = e.data;
  const ok = await verifyCode(email, String(f.get("code") ?? ""));
  if (!ok) return { ...prev, error: "That code is not right or has expired." };
  const u = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (u?.bannedAt) return { step: "email", error: "This account is closed." };
  if (u) { await startSession(u.id); redirect("/"); }
  await markVerified(email);
  return { step: "profile", email };
}

const Profile = z.object({
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9._]{3,20}$/, "3 to 20 letters, numbers, dots or underscores."),
  birthYear: z.coerce.number().int(),
  adult: z.literal("on", { message: "You must confirm you are 18 or older." }),
  look: z.string().default("kai"),
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
  const [u] = await db.insert(schema.users).values({ email, handle: p.data.handle, birthYear: p.data.birthYear, avatar: { kind: "3d", look: p.data.look } }).returning();
  await clearVerified();
  await startSession(u.id);
  redirect("/?welcome=1");
}

/* Development shortcut: sign in as a seeded demo account without email. Disabled in production. */
export async function demoSignIn(handle: string) {
  if (process.env.DEV_SHOW_CODE !== "1") throw new Error("Not available.");
  const u = await db.query.users.findFirst({ where: eq(schema.users.handle, handle) });
  if (!u || !u.email.endsWith("@demo.byrequest.app")) throw new Error("Only seeded demo accounts. Run npm run db:seed first.");
  await startSession(u.id);
  redirect("/");
}

export async function signOut() {
  await endSession();
  redirect("/signin");
}

export async function whoami() { return (await currentUser())?.handle ?? null; }
