/* Adds more demo creators with unique generated avatars, full profiles, test environment approvals
   and a few offers. Idempotent: creators that already exist are skipped, so it runs at every start. */
import "dotenv/config";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db, schema as S } from "../src/db";

const ctx: Record<string, unknown> = { window: {}, Math, JSON, Object, Array, String, Number };
vm.createContext(ctx);
vm.runInContext(readFileSync("public/avatar.js", "utf8"), ctx);
const A = (ctx.window as { BRQAvatar: { generate: (q: object) => Record<string, unknown>; svg: (s: object) => string } }).BRQAvatar;

type C = [handle: string, by: number, pres: "Man" | "Woman" | "Non-binary", len: string, style: string, pub: boolean, face: boolean, from: number, rating: [number, number], p: { bio: string; heightCm: number; build: string; sport: string; work: string; languages: string; hair: string; eyes: string; body: string; tattoos: string; makes: string[]; never: string[] }];
const LIST: C[] = [
  ["kai.v", 1996, "Non-binary", "Short", "Street", true, true, 3500, [88, 18], { bio: "Skater, night owl, honest about everything. I love a weird request.", heightCm: 175, build: "Slim", sport: "Skateboarding", work: "Barista", languages: "English, Dutch", hair: "Lilac undercut", eyes: "Brown", body: "Natural", tattoos: "Fine line, both arms", makes: ["Voice notes", "Outfit check", "Custom ideas"], never: ["Explicit"] }],
  ["nour", 1994, "Woman", "Medium", "Smart", true, false, 3000, [60, 12], { bio: "Calm voice, warm stories. I record late at night when the city is quiet.", heightCm: 168, build: "Slim", sport: "Swimming", work: "Pharmacist", languages: "English, French, Arabic", hair: "Covered", eyes: "Hazel", body: "Natural", tattoos: "No tattoos", makes: ["Voice notes", "Custom ideas"], never: ["Face", "Video"] }],
  ["tomas", 1997, "Man", "Short", "Sporty", true, false, 4000, [102, 21], { bio: "Rower, early riser, shower after every session. Natural and to the point.", heightCm: 191, build: "Athletic", sport: "Rowing, 6x a week", work: "Engineering student", languages: "English, Spanish", hair: "Short, brown", eyes: "Green", body: "Light body hair", tattoos: "No tattoos", makes: ["Shower", "Workout", "Morning routine"], never: ["Face"] }],
  ["luca.b", 1993, "Man", "Medium", "Casual", true, true, 5500, [140, 29], { bio: "Italian, loud laugh, bigger heart. Cooking clips and good mornings.", heightCm: 182, build: "Broad", sport: "Padel", work: "Chef", languages: "English, Italian", hair: "Dark waves", eyes: "Brown", body: "Natural", tattoos: "Sleeve, left arm", makes: ["Morning routine", "Voice notes", "Custom ideas"], never: ["Outdoor content"] }],
  ["mika", 2001, "Woman", "Long", "Artsy", true, true, 2500, [45, 10], { bio: "Art student with too many plants. Fit checks and slow mornings.", heightCm: 164, build: "Petite", sport: "Climbing", work: "Art student", languages: "English, Dutch, Japanese", hair: "Long, black", eyes: "Dark brown", body: "Natural", tattoos: "Small, wrist", makes: ["Outfit check", "Photos", "Morning routine"], never: ["Explicit"] }],
  ["joris", 1990, "Man", "Short", "Smart", false, false, 6000, [76, 15], { bio: "Lawyer by day. Precise, discreet, always on time.", heightCm: 186, build: "Fit", sport: "Running, cycling", work: "Lawyer", languages: "English, Dutch, French", hair: "Short, greying", eyes: "Blue", body: "Light body hair", tattoos: "No tattoos", makes: ["Shower", "Workout", "Voice notes"], never: ["Face"] }],
  ["dani.r", 1999, "Non-binary", "Medium", "Street", true, false, 3000, [33, 7], { bio: "Dancer and DJ. Night content is my thing.", heightCm: 172, build: "Toned", sport: "Dance", work: "DJ", languages: "English, Spanish", hair: "Curly, bleached", eyes: "Brown", body: "Smooth", tattoos: "Several", makes: ["Voice notes", "Custom ideas", "Outfit check"], never: ["Face"] }],
  ["ben", 1995, "Man", "Short", "Sporty", true, true, 4500, [118, 24], { bio: "Personal trainer. Gym content with good energy and zero ego.", heightCm: 183, build: "Muscular", sport: "Gym, boxing", work: "Personal trainer", languages: "English, German", hair: "Buzz cut", eyes: "Grey", body: "Smooth", tattoos: "Chest piece", makes: ["Workout", "Shower", "Photos"], never: ["Other people in frame"] }],
  ["sara.l", 1998, "Woman", "Long", "Casual", true, true, 3000, [64, 14], { bio: "Nurse on night shifts. Good night notes for when you cannot sleep.", heightCm: 170, build: "Curvy", sport: "Yoga", work: "Nurse", languages: "English, Dutch", hair: "Long, auburn", eyes: "Green", body: "Natural", tattoos: "No tattoos", makes: ["Voice notes", "Morning routine"], never: ["Video"] }],
  ["omar", 1992, "Man", "Short", "Smart", false, false, 5000, [52, 11], { bio: "Architect, quiet type, eye for detail and light.", heightCm: 180, build: "Slim", sport: "Swimming", work: "Architect", languages: "English, French, Arabic", hair: "Short, black", eyes: "Brown", body: "Natural", tattoos: "No tattoos", makes: ["Photos", "Shower", "Custom ideas"], never: ["Face"] }],
  ["finn", 2002, "Man", "Medium", "Street", true, true, 3000, [21, 5], { bio: "Student, surfer, always a bit sandy. New here and keen.", heightCm: 185, build: "Lean", sport: "Surfing", work: "Student", languages: "English, Dutch", hair: "Blond, messy", eyes: "Blue", body: "Smooth", tattoos: "No tattoos", makes: ["Morning routine", "Shower", "Outfit check"], never: ["Explicit"] }],
  ["ines", 1996, "Woman", "Medium", "Artsy", true, false, 3500, [39, 8], { bio: "Photographer. I care about light more than anything.", heightCm: 167, build: "Slim", sport: "Hiking", work: "Photographer", languages: "English, Portuguese", hair: "Short bob", eyes: "Brown", body: "Natural", tattoos: "Fine line, ankle", makes: ["Photos", "Custom ideas"], never: ["Face"] }],
  ["viktor", 1989, "Man", "Short", "Casual", true, true, 6500, [91, 19], { bio: "Former rugby player, deep voice, gentle. Ask me for a bedtime story.", heightCm: 190, build: "Broad", sport: "Rugby, gym", work: "Carpenter", languages: "English, Swedish", hair: "Bald, full beard", eyes: "Blue", body: "Hairy", tattoos: "Back piece", makes: ["Voice notes", "Workout", "Shower"], never: ["Outdoor content"] }],
  ["yuki", 2000, "Woman", "Short", "Street", false, false, 2500, [17, 4], { bio: "Gamer and night owl. Voice notes with a smile.", heightCm: 158, build: "Petite", sport: "Badminton", work: "Game tester", languages: "English, Japanese", hair: "Pink pixie", eyes: "Dark brown", body: "Natural", tattoos: "No tattoos", makes: ["Voice notes", "Custom ideas"], never: ["Video", "Face"] }],
];

async function main() {
  const doc = await db.query.documents.findFirst({ where: and(eq(S.documents.kind, "creator_agreement"), eq(S.documents.current, true)) });
  if (!doc) { console.log("No agreement yet, extra creators skipped."); process.exit(0); }
  const have = new Set((await db.select({ h: S.users.handle }).from(S.users).where(inArray(S.users.handle, LIST.map((c) => c[0])))).map((r) => r.h));
  const open = await db.select().from(S.requests).where(and(eq(S.requests.status, "open"), gt(S.requests.closesAt, new Date())));
  let added = 0;
  for (const [i, [h, by, pres, len, style, pub, face, from, r, p]] of LIST.entries()) {
    if (have.has(h)) continue;
    const spec = A.generate({ age: by < 1993 ? "35 to 44" : by < 1999 ? "25 to 34" : "18 to 24", pres, len, style, facial: "Any", glasses: "Any", skin: -1 });
    const [u] = await db.insert(S.users).values({ email: `${h.replace(/\W/g, "")}@demo.byrequest.app`, handle: h, birthYear: by, isCreator: true, avatar: { kind: "built", spec, svg: A.svg(spec) }, ratingSum: r[0], ratingCount: r[1] }).returning();
    await db.insert(S.creatorProfiles).values({ userId: u.id, visibility: pub ? "public" : "offer_only", showsFace: face, fromCents: from, replyMinutes: 30 + (i % 5) * 30, ...p });
    await db.insert(S.onboarding).values({ userId: u.id, email: "approved", identity: "approved", payout: "approved", agreement: "approved", accountType: "individual", country: "BE", lastStep: "done" });
    await db.insert(S.identityChecks).values({ userId: u.id, provider: "sandbox", env: "test", externalRef: `sbx_seed_${h}`, status: "approved", over18: true, documentChecked: true, livenessChecked: true, lastEventAt: new Date() });
    await db.insert(S.payoutAccounts).values({ userId: u.id, provider: "sandbox", env: "test", externalRef: `sbx_acct_seed_${h}`, accountType: "individual", country: "BE", status: "approved", canReceivePayouts: true, canProcessSales: true, lastEventAt: new Date() });
    await db.insert(S.consents).values({ userId: u.id, documentId: doc.id, kind: "creator_agreement", version: doc.version, sha256: doc.sha256, method: "checkbox_and_button" });
    for (const req of open.filter((_, k) => (k + i) % 6 === 0).slice(0, 3))
      await db.insert(S.offers).values({ requestId: req.id, creatorId: u.id, showsFace: face, vault: req.minVault, etaHours: Math.min(req.dueHours, 24), note: "Happy to make this." }).onConflictDoNothing();
    added++;
  }
  console.log(`Extra creators: ${added} added, ${have.size} already there.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
