/* Gives the demo creators that still had a drawn avatar one of the newer 3D avatars, and opens
   more of their profiles, so the creator rows show a varied set of people. Safe on every start:
   only demo accounts are touched, and only while they still have the drawn avatar. */
import "dotenv/config";
import { and, eq, like, sql } from "drizzle-orm";
import { db, schema as S } from "../src/db";
import { REPLACED } from "../src/domain/looks";

const LOOK: Record<string, string> = { "luca.b": "p05", ines: "p26", "sara.l": "p18", yuki: "p22", mika: "p08", joris: "p13", "dani.r": "p28", ben: "p16", tomas: "p04", finn: "p10", viktor: "p21", omar: "p20" };
const OPEN = ["luca.b", "ines", "sara.l", "mika", "dani.r", "ben", "tomas", "omar"];

async function main() {
  let n = 0;
  for (const [handle, look] of Object.entries(LOOK)) {
    const u = await db.query.users.findFirst({ where: and(eq(S.users.handle, handle), like(S.users.email, "%@demo.byrequest.app")) });
    if (!u) continue;
    if (u.avatar?.kind !== "3d") { await db.update(S.users).set({ avatar: { kind: "3d", look } }).where(eq(S.users.id, u.id)); n++; }
    if (OPEN.includes(handle)) await db.update(S.creatorProfiles).set({ visibility: "public" }).where(eq(S.creatorProfiles.userId, u.id));
  }
  // Any account on a retired avatar gets its replacement.
  for (const [from, to] of Object.entries(REPLACED)) {
    const r = await db.execute(sql`update users set avatar = jsonb_build_object('kind', '3d', 'look', ${to}::text) where avatar->>'kind' = '3d' and avatar->>'look' = ${from}`);
    n += r.rowCount ?? 0;
  }
  console.log(`Creator looks: ${n} updated.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
