/* The owner account (OWNER_EMAIL): admin with full control, and a verified buyer and creator, so
   both sides of the site can be seen with one login. Safe to run on every start. */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, schema as S } from "../src/db";

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email) return;
  const now = new Date();
  let u = await db.query.users.findFirst({ where: eq(S.users.email, email) });
  if (!u) {
    const handle = (await db.query.users.findFirst({ where: eq(S.users.handle, "byrequest") })) ? `owner${Date.now() % 10000}` : "byrequest";
    [u] = await db.insert(S.users).values({ email, handle, birthYear: 1990, isCreator: true, ageVerifiedAt: now, sensitiveConsentAt: now, avatar: { kind: "3d", look: "kai" } }).returning();
    console.log(`owner: created ${handle}`);
  } else await db.update(S.users).set({ isCreator: true, ageVerifiedAt: u.ageVerifiedAt ?? now, sensitiveConsentAt: u.sensitiveConsentAt ?? now, bannedAt: null, deletedAt: null }).where(eq(S.users.id, u.id));
  const id = u.id;
  await db.insert(S.staff).values({ userId: id, role: "admin" }).onConflictDoUpdate({ target: S.staff.userId, set: { role: "admin" } });
  await db.insert(S.creatorProfiles).values({ userId: id }).onConflictDoNothing();
  const done = { email: "approved", identity: "approved", payout: "approved", agreement: "approved", accountType: "individual", country: "BE", lastStep: "done" } as const;
  await db.insert(S.onboarding).values({ userId: id, ...done }).onConflictDoUpdate({ target: S.onboarding.userId, set: done });
  if (!(await db.query.identityChecks.findFirst({ where: eq(S.identityChecks.userId, id) })))
    await db.insert(S.identityChecks).values({ userId: id, provider: "sandbox", env: "test", externalRef: `owner_${id}`, status: "approved", over18: true, documentChecked: true, livenessChecked: true, lastEventAt: now });
  if (!(await db.query.payoutAccounts.findFirst({ where: eq(S.payoutAccounts.userId, id) })))
    await db.insert(S.payoutAccounts).values({ userId: id, provider: "sandbox", env: "test", externalRef: `owner_acct_${id}`, accountType: "individual", country: "BE", status: "approved", canReceivePayouts: true, canProcessSales: true, missing: [], lastEventAt: now });
  for (const kind of ["terms", "privacy", "creator_agreement"] as const) {
    const d = await db.query.documents.findFirst({ where: and(eq(S.documents.kind, kind), eq(S.documents.current, true)) });
    if (!d || (await db.query.consents.findFirst({ where: and(eq(S.consents.userId, id), eq(S.consents.documentId, d.id)) }))) continue;
    await db.insert(S.consents).values({ userId: id, documentId: d.id, kind, version: d.version, sha256: d.sha256, method: kind === "privacy" ? "acknowledged_link" : "checkbox_and_button" });
  }
  console.log("owner: ready");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
