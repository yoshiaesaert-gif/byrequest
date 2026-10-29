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
  // Demo creators describe how they look, like real ones do, so buyers see the full profile.
  const W = ["lina.m", "ava.r", "ines", "sara.l", "nour", "yuki", "mika", "dani.r", "ruby"];
  const hair = ["smooth", "light", "hairy"] as const, pubic = ["shaved", "trimmed", "natural"] as const, size = ["14_16", "16_18", "18_20", "16_18"] as const, cup = ["a", "b", "c", "d"] as const;
  const demo = await db.select({ id: S.users.id, handle: S.users.handle, detail: S.creatorProfiles.detail }).from(S.creatorProfiles).innerJoin(S.users, eq(S.users.id, S.creatorProfiles.userId)).where(like(S.users.email, "%@demo.byrequest.app"));
  for (const [i, d] of demo.entries()) {
    if (d.detail && Object.keys(d.detail).length) continue;
    const woman = W.includes(d.handle);
    await db.update(S.creatorProfiles).set({ detail: woman
      ? { gender: "woman", bodyHair: "smooth", pubic: pubic[i % 3], cup: cup[i % 4] }
      : { gender: "man", bodyHair: hair[i % 3], pubic: pubic[(i + 1) % 3], size: size[i % 4], cut: i % 3 ? "uncut" : "cut" } }).where(eq(S.creatorProfiles.userId, d.id));
    n++;
  }
  // Any account on a retired avatar gets its replacement.
  for (const [from, to] of Object.entries(REPLACED)) {
    const r = await db.execute(sql`update users set avatar = jsonb_build_object('kind', '3d', 'look', ${to}::text) where avatar->>'kind' = '3d' and avatar->>'look' = ${from}`);
    n += r.rowCount ?? 0;
  }
  console.log(`Creator looks: ${n} updated.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
