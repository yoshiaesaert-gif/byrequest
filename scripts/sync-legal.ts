/* Publishes new versions of the legal texts. A version already in the database is left alone, so
   the hash of an accepted text never changes. Runs at every start. */
import "dotenv/config";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as S } from "../src/db";
import { DOCS } from "../src/legal/documents";

async function main() {
  let added = 0;
  for (const d of DOCS) {
    const have = await db.query.documents.findFirst({ where: and(eq(S.documents.kind, d.kind), eq(S.documents.version, d.version)) });
    if (have) continue;
    await db.transaction(async (tx) => {
      await tx.update(S.documents).set({ current: false }).where(eq(S.documents.kind, d.kind));
      await tx.insert(S.documents).values({ ...d, sha256: createHash("sha256").update(d.body).digest("hex"), status: "draft_pending_review", current: true });
    });
    added++;
  }
  // Fictional demo accounts accept the new texts, so the demo keeps working. Real accounts are asked again.
  if (added) {
    const docs = await db.select().from(S.documents).where(eq(S.documents.current, true));
    const demo = await db.select({ id: S.users.id, isCreator: S.users.isCreator }).from(S.users).where(sql`${S.users.email} like '%@demo.byrequest.app'`);
    for (const u of demo) for (const d of docs) {
      if (d.kind === "participant_consent" || (d.kind === "creator_agreement" && !u.isCreator)) continue;
      const has = await db.query.consents.findFirst({ where: and(eq(S.consents.userId, u.id), eq(S.consents.documentId, d.id)) });
      if (!has) await db.insert(S.consents).values({ userId: u.id, documentId: d.id, kind: d.kind, version: d.version, sha256: d.sha256, method: "checkbox_and_button" });
    }
  }
  console.log(`Legal texts: ${added} new version(s) published.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
