"use server";
import { queueNew } from "@/server/moderation";
import { ENABLED_CATEGORIES } from "@/config/compliance";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser, requireCreator, endSession } from "@/server/auth";
import { deleteAccount } from "@/server/privacy";
import { getLocale } from "@/i18n/server";
import * as deals from "@/server/deals";
import * as albums from "@/server/albums";
import * as onboarding from "@/server/onboarding";
import * as participants from "@/server/participants";
import { chooseCover } from "@/server/covers";
import { RuleError, addHours, type VaultPeriod } from "@/domain/rules";

export type Result = { ok: true; msg?: string; lines?: { ok: boolean; text: string }[] } | { ok: false; error: string; lines?: { ok: boolean; text: string }[] };

async function guard(fn: () => Promise<Result | void>): Promise<Result> {
  try { return (await fn()) ?? { ok: true }; }
  catch (e) {
    unstable_rethrow(e);
    if (e instanceof RuleError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

export async function setMode(mode: "buy" | "sell") {
  const u = await requireUser();
  (await cookies()).set("brq_mode", u.isCreator ? mode : "buy", { path: "/", sameSite: "lax", maxAge: 31536000 });
  revalidatePath("/", "layout");
}

export async function toggleSave(requestId: string) {
  const u = await requireUser();
  const where = and(eq(schema.saves.userId, u.id), eq(schema.saves.requestId, requestId));
  const ex = await db.query.saves.findFirst({ where });
  if (ex) await db.delete(schema.saves).where(where);
  else await db.insert(schema.saves).values({ userId: u.id, requestId });
  return !ex;
}

const Post = z.object({
  category: z.enum(ENABLED_CATEGORIES),
  amount: z.coerce.number().int().min(1).max(60),
  title: z.string().trim().min(4, "Give it a short title.").max(70),
  details: z.string().trim().max(600).default(""),
  who: z.enum(["Man", "Woman", "Anyone"]),
  ageMin: z.coerce.number().int().min(18).max(80),
  ageMax: z.coerce.number().int().min(18).max(99),
  face: z.enum(["not_needed", "optional", "required"]),
  minVault: z.enum(["7d", "30d", "1y", "forever"]),
  dueHours: z.coerce.number().int().refine((h) => [24, 48, 72, 168].includes(h)),
  budget: z.coerce.number().int().min(10, "The minimum is €10.").max(2000),
  neutral: z.boolean().default(false),
  openHours: z.coerce.number().int().min(2).max(168).default(24),
  waiver: z.boolean().default(false),
});

export async function postRequest(input: z.input<typeof Post>): Promise<Result> {
  return guard(async () => {
    const u = await requireUser();
    const p = Post.safeParse(input);
    if (!p.success) return { ok: false, error: p.error.issues[0].message };
    if (p.data.ageMin > p.data.ageMax) return { ok: false, error: "Check the age range." };
    const { neutral, waiver, budget, openHours, ...data } = p.data;
    const cover = neutral ? null : await chooseCover(data.category, data.title);   // picked for variety, not by the buyer
    // Paid when posted: the payment partner holds it during review and while the request is open.
    const r = await deals.postPaid(u.id, { ...data, dealCents: budget * 100, cover, lang: await getLocale(), closesAt: addHours(new Date(), openHours) }, { withdrawalWaiver: waiver });
    await queueNew(r.id);   // automatic check, then a person approves it (or it goes live by itself when staff allow that)
    redirect(`/requests/${r.id}/offers?posted=1`);
  });
}

export async function makeOffer(input: { requestId: string; showsFace: boolean; vault: VaultPeriod; etaHours: number; note: string }): Promise<Result> {
  return guard(async () => {
    const u = await requireCreator();
    await deals.makeOffer(u.id, input);   // onboarding gates are enforced inside
    revalidatePath(`/requests/${input.requestId}`);
    return { ok: true, msg: "Offer sent. You hear it when you are chosen." };
  });
}

export async function acceptOffer(offerId: string, withdrawalWaiver: boolean): Promise<Result> {
  return guard(async () => {
    const u = await requireUser();
    const d = await deals.acceptOffer(u.id, offerId, { withdrawalWaiver });
    redirect(`/deals/${d.id}?accepted=1`);
  });
}

export async function deliver(dealId: string, f: FormData): Promise<Result> {
  return guard(async () => {
    const u = await requireCreator();
    const files = f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
    if (!files.length) return { ok: false, error: "Choose a file first." };
    const onlyCreator = f.get("onlyCreator") === "yes";
    const participantIds = f.getAll("participant").map(String).filter(Boolean);
    const r = await deals.deliver(u.id, dealId, files, { onlyCreator, participantIds });
    revalidatePath(`/deals/${dealId}`);
    return r.ok ? { ok: true, lines: r.lines, msg: "Delivered. It is in the buyer's vault." } : { ok: false, error: "This upload cannot be sent.", lines: r.lines };
  });
}

export async function releaseNow(dealId: string): Promise<Result> {
  return guard(async () => { const u = await requireUser(); await deals.releaseNow(u.id, dealId); revalidatePath(`/deals/${dealId}`); return { ok: true, msg: "Released. Thank you." }; });
}

export async function object(dealId: string, reason: string, note: string): Promise<Result> {
  return guard(async () => { const u = await requireUser(); await deals.object(u.id, dealId, reason, note); revalidatePath(`/deals/${dealId}`); return { ok: true, msg: "Reported. A person reviews it within 24 hours." }; });
}

export async function rate(dealId: string, stars: number): Promise<Result> {
  return guard(async () => { const u = await requireUser(); await deals.rate(u.id, dealId, stars); revalidatePath(`/deals/${dealId}`); return { ok: true, msg: "Thanks for rating." }; });
}

export async function rateBuyer(dealId: string, stars: number): Promise<Result> {
  return guard(async () => { const u = await requireUser(); await deals.rateBuyer(u.id, dealId, stars); revalidatePath(`/deals/${dealId}`); return { ok: true, msg: "Thanks for rating." }; });
}

export async function requestAlbum(offerId: string, kind: "looks" | "body" | "intimate"): Promise<Result> {
  return guard(async () => { const u = await requireUser(); await albums.requestAlbum(u.id, offerId, kind); revalidatePath("/c", "layout"); return { ok: true, msg: "Request sent. They decide whether to send it." }; });
}

export async function answerAlbum(albumId: string, f: FormData | null): Promise<Result> {
  return guard(async () => {
    const u = await requireCreator();
    const files = f ? f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0) : null;
    await albums.answerAlbum(u.id, albumId, files);
    revalidatePath("/studio");
    return { ok: true, msg: files ? "Preview album sent." : "Declined." };
  });
}

/* The client encrypts with NaCl box before calling this. The server stores nonce and ciphertext only. */
export async function sendMessage(dealId: string, nonce: string, body: string): Promise<Result> {
  return guard(async () => {
    const u = await requireUser();
    const d = await db.query.deals.findFirst({ where: eq(schema.deals.id, dealId) });
    if (!d || (d.buyerId !== u.id && d.creatorId !== u.id)) return { ok: false, error: "Not your deal." };
    if (!/^[A-Za-z0-9+/=]{20,64}$/.test(nonce) || body.length > 8000) return { ok: false, error: "Invalid message." };
    await db.insert(schema.messages).values({ dealId, senderId: u.id, kind: "e2e", nonce, body });
    const other = d.buyerId === u.id ? d.creatorId : d.buyerId;
    await db.insert(schema.notifications).values({ userId: other, title: "New message", body: "You have a new message.", href: `/deals/${dealId}` });
  });
}

export async function setPublicKey(pk: string) {
  const u = await requireUser();
  if (!/^[A-Za-z0-9+/=]{43,44}$/.test(pk)) throw new Error("bad key");
  if (u.publicKey && u.publicKey !== pk) return { changed: true }; // a new device; old messages stay unreadable there
  await db.update(schema.users).set({ publicKey: pk }).where(eq(schema.users.id, u.id));
  return { changed: false };
}

export async function forceNewKey(pk: string) {
  const u = await requireUser();
  if (!/^[A-Za-z0-9+/=]{43,44}$/.test(pk)) throw new Error("bad key");
  await db.update(schema.users).set({ publicKey: pk }).where(eq(schema.users.id, u.id));
}

export async function setPref(key: "frost" | "discreetPush" | "neutralTab", value: boolean) {
  const u = await requireUser();
  await db.update(schema.users).set({ prefs: { ...u.prefs, [key]: value } }).where(eq(schema.users.id, u.id));
  revalidatePath("/", "layout");
}

export async function setAvatar(a: { kind: "3d"; look: string } | { kind: "built"; spec: Record<string, unknown> }) {
  const u = await requireUser();
  await db.update(schema.users).set({ avatar: a }).where(eq(schema.users.id, u.id));
  revalidatePath("/", "layout");
}

const ProfileForm = z.object({
  visibility: z.enum(["offer_only", "public"]),
  bio: z.string().trim().max(400),
  heightCm: z.coerce.number().int().min(120).max(230).optional().or(z.literal("").transform(() => undefined)),
  build: z.string().trim().max(40), sport: z.string().trim().max(60), work: z.string().trim().max(60),
  languages: z.string().trim().max(60), hair: z.string().trim().max(40), eyes: z.string().trim().max(30),
  body: z.string().trim().max(40), tattoos: z.string().trim().max(60),
  makes: z.string().trim().max(200), never: z.string().trim().max(200),
  showsFace: z.enum(["yes", "no"]),
  defaultVault: z.enum(["7d", "30d", "1y", "forever"]),
});

export async function saveProfile(f: FormData): Promise<Result> {
  return guard(async () => {
    const u = await requireCreator();
    const p = ProfileForm.safeParse(Object.fromEntries(f));
    if (!p.success) return { ok: false, error: p.error.issues[0].message };
    const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8);
    const v = { ...p.data, makes: list(p.data.makes), never: list(p.data.never), showsFace: p.data.showsFace === "yes", heightCm: p.data.heightCm ?? null };
    await db.insert(schema.creatorProfiles).values({ userId: u.id, ...v }).onConflictDoUpdate({ target: schema.creatorProfiles.userId, set: v });
    revalidatePath("/settings");
    return { ok: true, msg: "Profile saved." };
  });
}

/* Starts creator onboarding. A creator can prepare a profile right away; offers, uploads and
   payouts open only after identity, agreement and payout setup are approved. */
export async function becomeCreator(): Promise<Result> {
  return guard(async () => {
    const u = await requireUser();
    await onboarding.ensure(u.id);
    await db.insert(schema.creatorProfiles).values({ userId: u.id }).onConflictDoNothing();
    (await cookies()).set("brq_mode", "sell", { path: "/", sameSite: "lax", maxAge: 31536000 });
    redirect("/onboarding");
  });
}

export async function markAllRead() {
  const u = await requireUser();
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, u.id), isNull(schema.notifications.readAt)));
  revalidatePath("/", "layout");
}

/* Marketing consent is separate from every required agreement. */
export async function setMarketing(on: boolean) {
  const u = await requireUser();
  await db.update(schema.users).set({ marketingOptIn: on }).where(eq(schema.users.id, u.id));
  await onboarding.log(db, `user:${u.id}`, on ? "marketing.opt_in" : "marketing.opt_out", u.id);
}

export async function addParticipant(label: string): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const u = await requireCreator();
  if (!label.trim()) return { ok: false, error: "Add a label." };
  const { link } = await participants.addParticipant(u.id, label);
  revalidatePath("/studio");
  return { ok: true, link };
}

export async function deleteMyAccount(): Promise<Result> {
  return guard(async () => {
    const u = await requireUser();
    await deleteAccount(u.id);
    await endSession();
    redirect("/signin?deleted=1");
  });
}

/* Existing accounts give the explicit consent for sensitive data once, like new ones do at sign up. */
export async function giveSensitiveConsent(): Promise<Result> {
  return guard(async () => {
    const u = await requireUser();
    await db.update(schema.users).set({ sensitiveConsentAt: new Date() }).where(eq(schema.users.id, u.id));
    await onboarding.log(db, `user:${u.id}`, "consent.sensitive_data", u.id);
    redirect("/");
  });
}
