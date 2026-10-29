import "server-only";
import { cookies, headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse, type RegistrationResponseJSON, type AuthenticationResponseJSON, type AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { db, schema } from "@/db";
import { hmac, startSession } from "./auth";
import { RuleError } from "@/domain/rules";

const { passkeys, users } = schema;
const CH = "brq_wa";

/* The site the passkey belongs to: byrequest.me in production, localhost while developing. */
async function rp() {
  const h = await headers();
  const host = (h.get("host") ?? "").split(",")[0].trim();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return { rpID: host.split(":")[0], origin: `http://${host}` };
  const u = new URL(process.env.SITE_URL || "https://byrequest.me");     // never trust a forwarded host for the passkey domain
  return { rpID: u.hostname, origin: u.origin };
}
// The challenge lives five minutes in a signed, http only cookie.
async function keep(challenge: string, purpose: string) {
  const exp = Date.now() + 5 * 60_000; const v = `${purpose}|${challenge}|${exp}`;
  (await cookies()).set(CH, `${v}|${hmac(v)}`, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
}
async function take(purpose: string) {
  const jar = await cookies(); const raw = jar.get(CH)?.value ?? ""; jar.delete(CH);
  const [p, challenge, exp, sig] = raw.split("|");
  if (!sig || hmac(`${p}|${challenge}|${exp}`) !== sig || p !== purpose || Date.now() > +exp) throw new RuleError("This took too long. Try again.");
  return challenge;
}
const deviceName = (ua: string) => /iphone/i.test(ua) ? "iPhone" : /ipad/i.test(ua) ? "iPad" : /android/i.test(ua) ? "Android" : /mac os/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : "This device";

export async function registrationOptions(user: { id: string; handle: string }) {
  const { rpID } = await rp();
  const mine = await db.select({ id: passkeys.id, transports: passkeys.transports }).from(passkeys).where(eq(passkeys.userId, user.id));
  const o = await generateRegistrationOptions({
    rpName: "ByRequest", rpID, userName: user.handle, userDisplayName: user.handle, userID: new TextEncoder().encode(user.id),
    attestationType: "none", excludeCredentials: mine.map((m) => ({ id: m.id, transports: (m.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await keep(o.challenge, `reg:${user.id}`);
  return o;
}

export async function register(userId: string, response: RegistrationResponseJSON) {
  const { rpID, origin } = await rp();
  const v = await verifyRegistrationResponse({ response, expectedChallenge: await take(`reg:${userId}`), expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false });
  if (!v.verified || !v.registrationInfo) throw new RuleError("The passkey could not be saved. Try again.");
  const c = v.registrationInfo.credential;
  const ua = (await headers()).get("user-agent") ?? "";
  await db.insert(passkeys).values({ id: c.id, userId, publicKey: isoBase64URL.fromBuffer(c.publicKey), counter: c.counter, transports: c.transports ?? null, name: deviceName(ua) }).onConflictDoNothing();
  await db.insert(schema.audit).values({ actor: `user:${userId}`, action: "auth.passkey_added", subjectUserId: userId });
}

export async function authenticationOptions() {
  const { rpID } = await rp();
  const o = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });   // discoverable: the device offers its own passkeys
  await keep(o.challenge, "auth");
  return o;
}

export async function authenticate(response: AuthenticationResponseJSON) {
  const { rpID, origin } = await rp();
  const challenge = await take("auth");
  const pk = await db.query.passkeys.findFirst({ where: eq(passkeys.id, response.id) });
  if (!pk) throw new RuleError("This passkey is not known here. Sign in with your email code.");
  const u = await db.query.users.findFirst({ where: eq(users.id, pk.userId) });
  if (!u || u.bannedAt || u.deletedAt) throw new RuleError("This account cannot sign in.");
  const v = await verifyAuthenticationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false,
    credential: { id: pk.id, publicKey: isoBase64URL.toBuffer(pk.publicKey), counter: pk.counter, transports: (pk.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined } });
  if (!v.verified) throw new RuleError("Sign in with your passkey failed. Try again.");
  await db.update(passkeys).set({ counter: v.authenticationInfo.newCounter, lastUsedAt: new Date() }).where(eq(passkeys.id, pk.id));
  await startSession(u.id);
  return u;
}

export const listPasskeys = (userId: string) => db.select({ id: passkeys.id, name: passkeys.name, createdAt: passkeys.createdAt, lastUsedAt: passkeys.lastUsedAt }).from(passkeys).where(eq(passkeys.userId, userId)).orderBy(passkeys.createdAt);
export async function removePasskey(userId: string, id: string) {
  await db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)));
  await db.insert(schema.audit).values({ actor: `user:${userId}`, action: "auth.passkey_removed", subjectUserId: userId });
}
