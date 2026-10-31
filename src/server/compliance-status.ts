import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/* Whether one account meets the rules, in one place for staff: age and identity through the verification partner,
   signed documents, payout setup and restrictions. A check by the test provider never counts as valid. */
export type Check = { k: string; label: string; ok: boolean | null; value: string; note?: string };

export async function complianceOf(userId: string) {
  const S = schema;
  const u = await db.query.users.findFirst({ where: eq(S.users.id, userId) });
  if (!u) return null;
  const [onb, idc, conf, pay, cons] = await Promise.all([
    db.query.onboarding.findFirst({ where: eq(S.onboarding.userId, userId) }),
    db.select().from(S.identityChecks).where(eq(S.identityChecks.userId, userId)).orderBy(desc(S.identityChecks.createdAt)).limit(1),
    db.query.confidentialIdentity.findFirst({ where: eq(S.confidentialIdentity.userId, userId), columns: { source: true, updatedAt: true } }),
    db.query.payoutAccounts.findFirst({ where: eq(S.payoutAccounts.userId, userId) }),
    db.select({ kind: S.consents.kind, version: S.consents.version, at: S.consents.acceptedAt }).from(S.consents).where(eq(S.consents.userId, userId)).orderBy(desc(S.consents.acceptedAt)),
  ]);
  const d = (x: Date) => x.toLocaleString("en-GB", { timeZone: "Europe/Brussels", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const consent = (k: string) => cons.find((c) => c.kind === k);
  const chk = idc[0];
  const realId = !!chk && chk.status === "approved" && chk.provider !== "sandbox" && onb?.identity === "approved";
  const age = new Date().getFullYear() - u.birthYear;
  const creator = u.isCreator;
  const checks: Check[] = [];
  checks.push({ k: "age", label: "18 or older", ok: creator ? realId : !!u.ageVerifiedAt || realId,
    value: creator ? (realId ? `Confirmed by ${chk!.provider}` : "Not confirmed by the partner") : u.ageVerifiedAt ? `Confirmed ${d(u.ageVerifiedAt)}` : realId ? "Confirmed through the ID check" : "Not checked yet",
    note: creator ? undefined : "Buyers confirm their age before their first purchase." });
  if (creator) {
    checks.push({ k: "id", label: "ID and liveness check", ok: realId,
      value: !chk ? "Not started" : `${chk.status}${chk.provider === "sandbox" ? " by the test provider (not valid)" : ` by ${chk.provider}`} · ${d(chk.lastEventAt ?? chk.createdAt)}`,
      note: chk ? `Document ${chk.documentChecked ? "checked" : "not checked"} · liveness ${chk.livenessChecked ? "checked" : "not checked"}${chk.env === "test" ? " · partner account in test mode" : ""}` : undefined });
    checks.push({ k: "record", label: "Verified identity on file", ok: !!conf && conf.source !== "sandbox", value: conf ? `Encrypted, from ${conf.source} · ${d(conf.updatedAt)}` : "Nothing on file", note: "Name and date of birth, sealed. Never shown on the profile." });
  }
  checks.push({ k: "shown", label: "Age shown on the profile", ok: null, value: `${age} (born ${u.birthYear})`, note: conf && conf.source !== "sandbox" ? "Birth year taken from the ID" : "Birth year as filled in at sign up" });
  checks.push({ k: "terms", label: "Terms of use", ok: !!consent("terms"), value: consent("terms") ? `Version ${consent("terms")!.version} · ${d(consent("terms")!.at)}` : "Not accepted" });
  checks.push({ k: "privacy", label: "Privacy statement", ok: !!consent("privacy"), value: consent("privacy") ? `Version ${consent("privacy")!.version} · ${d(consent("privacy")!.at)}` : "Not acknowledged" });
  if (creator) {
    checks.push({ k: "agreement", label: "Creator agreement", ok: !!consent("creator_agreement"), value: consent("creator_agreement") ? `Signed, version ${consent("creator_agreement")!.version} · ${d(consent("creator_agreement")!.at)}` : "Not signed" });
    checks.push({ k: "payout", label: "Payout account", ok: pay ? pay.status === "approved" && pay.provider !== "sandbox" : false,
      value: pay ? `${pay.status}${pay.provider === "sandbox" ? " at the test provider: no real payouts yet" : ` at ${pay.provider}`} · ${pay.country ?? ""}` : "Not set up" });
  }
  checks.push({ k: "account", label: "Account standing", ok: !u.bannedAt && onb?.restriction !== "suspended", value: u.bannedAt ? `Blocked: ${u.banReason ?? ""}` : onb?.restriction && onb.restriction !== "none" ? `Restricted: ${onb.restriction}` : "Active" });
  const required = checks.filter((c) => c.ok !== null && !(c.k === "payout"));
  const missing = required.filter((c) => !c.ok);
  return { checks, ok: missing.length === 0, missing: missing.map((c) => c.label), creator };
}
