/* Seeds a believable marketplace: creators with full profiles, open requests, offers on the demo
   buyer's own request, a delivered photo set in the vault and a history of completed deals.
   Run: npm run db:seed (wipes existing data). */
import "dotenv/config";
import { readFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { split, addHours, vaultUntil } from "../src/domain/rules";
import { createHash } from "node:crypto";
import { DOCS } from "../src/legal/documents";

const S = schema;
const H = (h: number) => addHours(new Date(), h);

async function main() {
  if (process.argv.includes("--if-empty")) {
    const r = await db.execute(sql`select count(*)::int as n from users`);
    if (Number((r.rows[0] as { n: number }).n) > 0) { await repairSeedMedia(); console.log("Database already has data, seed skipped."); process.exit(0); }
  }
  await db.execute(sql`truncate appeals, removal_requests, participant_consents, participants, deliveries, audit_log, provider_events, consents, legal_documents, payout_accounts, confidential_identity, identity_checks, creator_onboarding, staff, ledger, saves, notifications, preview_albums, messages, disputes, vault_items, media, deals, offers, requests, creator_profiles, sessions, login_codes, users cascade`);
  const storage = path.resolve(process.env.STORAGE_DIR || "./storage");
  await rm(storage, { recursive: true, force: true });
  await mkdir(storage, { recursive: true });

  const mk = (handle: string, o: Partial<typeof S.users.$inferInsert> = {}) => ({ email: `${handle.replace(/\W/g, "")}@demo.byrequest.app`, handle, birthYear: 1996, ...o });
  const buyers = await db.insert(S.users).values([
    mk("nightowl", { avatar: { kind: "3d", look: "kai" }, birthYear: 1993 }),
    mk("k_22"), mk("sam_x"), mk("j_m"), mk("lou"), mk("tide"), mk("rook"),
  ]).returning();
  const byH = Object.fromEntries(buyers.map((b) => [b.handle, b]));

  const C = [
    { h: "milo", by: 1999, vis: "offer_only", face: false, from: 4000, reply: 60, look: "milo", r: [151, 31], p: { bio: "Physio student who lives in the gym. Calm, honest, always on time. I keep it natural and I never show my face.", heightCm: 184, build: "Athletic", sport: "Football, gym 4x a week", work: "Physio student", languages: "English, Dutch", hair: "Dark brown, short", eyes: "Brown", body: "Light body hair", tattoos: "No tattoos", makes: ["Shower", "Workout", "Morning routine", "Voice notes"], never: ["Face", "Other people in frame"] } },
    { h: "jens", by: 1995, vis: "public", face: true, from: 5000, reply: 180, look: "jens", r: [56, 12], p: { bio: "Night owl behind the bar, runner in the morning. Happy to show my face if you like.", heightCm: 179, build: "Slim", sport: "Running, 3x a week", work: "Bartender", languages: "English, Dutch, German", hair: "Blond quiff", eyes: "Blue", body: "Smooth", tattoos: "One small tattoo, left arm", makes: ["Outfit check", "Shower", "Custom ideas"], never: ["Outdoor content"] } },
    { h: "sem", by: 1992, vis: "offer_only", face: false, from: 4500, reply: 120, look: "sem", r: [20, 4], p: { bio: "Carpenter with big hands and a soft voice. I do things properly or not at all.", heightCm: 188, build: "Muscular", sport: "Crossfit, cycling", work: "Carpenter", languages: "English, Dutch", hair: "Short, dark beard", eyes: "Green", body: "Natural", tattoos: "Sleeve, right arm", makes: ["Workout", "Photos", "Voice notes"], never: ["Face"] } },
    { h: "noah", by: 2002, vis: "offer_only", face: false, from: 3500, reply: 45, look: "noah", r: [0, 0], p: { bio: "New here, verified, and keen to do it right. Ask me anything about the request first.", heightCm: 176, build: "Fit", sport: "Basketball", work: "Marketing student", languages: "English, French", hair: "Short black curls", eyes: "Dark brown", body: "Smooth", tattoos: "No tattoos", makes: ["Photos", "Morning routine"], never: ["Face"] } },
    { h: "ava.r", by: 2000, vis: "public", face: true, from: 3000, reply: 20, look: "ava", r: [290, 58], p: { bio: "Dancer with a lot of energy. Outfit checks and good vibes.", heightCm: 170, build: "Toned", sport: "Dance, pilates", work: "Dancer", languages: "English, French", hair: "Long box braids", eyes: "Brown", body: "Natural", tattoos: "Small tattoo, ankle", makes: ["Outfit check", "Photos", "Voice notes"], never: ["Explicit"] } },
    { h: "lina.m", by: 1997, vis: "public", face: false, from: 2500, reply: 60, look: "lina", r: [106, 22], p: { bio: "Writer with a radio voice. Good night notes are my thing.", heightCm: 166, build: "Slim", sport: "Yoga", work: "Copywriter", languages: "English, Dutch", hair: "Auburn bob", eyes: "Hazel", body: "Natural", tattoos: "No tattoos", makes: ["Voice notes", "Custom ideas"], never: ["Video"] } },
    { h: "dre", by: 1988, vis: "public", face: true, from: 6000, reply: 240, look: "dre", r: [44, 9], p: { bio: "Chef by day, storyteller by night. Big laugh, warm voice.", heightCm: 186, build: "Broad", sport: "Boxing", work: "Chef", languages: "English, Spanish", hair: "Shaved, full beard", eyes: "Dark brown", body: "Natural", tattoos: "No tattoos", makes: ["Voice notes", "Custom ideas", "Workout"], never: ["Explicit"] } },
    { h: "ruby", by: 1999, vis: "public", face: true, from: 3500, reply: 30, look: "ruby", r: [72, 15], p: { bio: "Fit checks, honest opinions and zero drama.", heightCm: 172, build: "Toned", sport: "Tennis", work: "Stylist", languages: "English", hair: "Copper waves", eyes: "Green", body: "Natural", tattoos: "Small tattoo, wrist", makes: ["Outfit check", "Photos"], never: ["Explicit"] } },
  ] as const;
  const creators = await db.insert(S.users).values(C.map((c) => mk(c.h, { birthYear: c.by, isCreator: true, avatar: { kind: "3d", look: c.look }, ratingSum: c.r[0], ratingCount: c.r[1] }))).returning();
  await db.insert(S.creatorProfiles).values(C.map((c, i) => ({ userId: creators[i].id, visibility: c.vis, showsFace: c.face, fromCents: c.from, replyMinutes: c.reply, ...c.p, makes: [...c.p.makes], never: [...c.p.never] })));

  /* legal documents, versioned and hashed */
  const docs = await db.insert(S.documents).values(DOCS.map((d) => ({ ...d, sha256: createHash("sha256").update(d.body).digest("hex"), status: "draft_pending_review" as const }))).returning();
  const agreement = docs.find((d) => d.kind === "creator_agreement")!;

  /* Onboarding for seeded creators. All approvals come from the simulated TEST provider and are
     stored with env = test, so they can never count as production checks. noah still has a
     payout step open, which shows the gates in action. */
  for (const c of creators) {
    const pending = c.handle === "noah";
    await db.insert(S.onboarding).values({ userId: c.id, email: "approved", identity: "approved", payout: pending ? "action_required" : "approved", agreement: "approved", accountType: "individual", country: "BE", lastStep: pending ? "payouts" : "done" });
    await db.insert(S.identityChecks).values({ userId: c.id, provider: "sandbox", env: "test", externalRef: `sbx_seed_${c.handle}`, status: "approved", over18: true, documentChecked: true, livenessChecked: true, lastEventAt: new Date() });
    await db.insert(S.payoutAccounts).values({ userId: c.id, provider: "sandbox", env: "test", externalRef: `sbx_acct_seed_${c.handle}`, accountType: "individual", country: "BE", status: pending ? "action_required" : "approved", canReceivePayouts: !pending, canProcessSales: !pending, missing: pending ? ["tax_id"] : [], actionUrl: pending ? "http://localhost:3000/sandbox/payout/sbx_acct_seed_noah" : null, lastEventAt: new Date() });
    await db.insert(S.consents).values({ userId: c.id, documentId: agreement.id, kind: "creator_agreement", version: agreement.version, sha256: agreement.sha256, method: "checkbox_and_button" });
  }
  for (const d of docs.filter((d) => d.kind === "terms" || d.kind === "privacy"))
    await db.insert(S.consents).values([...buyers, ...creators].map((u) => ({ userId: u.id, documentId: d.id, kind: d.kind, version: d.version, sha256: d.sha256, method: d.kind === "privacy" ? "acknowledged_link" as const : "checkbox_and_button" as const })));

  /* support account for the review queue and admin overview */
  const [ops] = await db.insert(S.users).values(mk("ops", { birthYear: 1990, avatar: { kind: "3d", look: "nour" } })).returning();
  await db.insert(S.staff).values({ userId: ops.id, role: "admin" });
  const cr = Object.fromEntries(creators.map((c) => [c.handle, c]));

  /* open requests from other buyers */
  const VP = { "7 days": "7d", "30 days": "30d", "1 year": "1y", Forever: "forever" } as const;
  const FACE = { "Not needed": "not_needed", Optional: "optional", Required: "required" } as const;
  const rows: [string, "video" | "photos" | "voice" | "custom", number, number, string, string, keyof typeof FACE, number, number, keyof typeof VP, string][] = [
    ["Shower video, calm and natural", "video", 10, 100, "Man", "18-25", "Not needed", 48, 14, "30 days", "c01"],
    ["Post workout photo set", "photos", 8, 45, "Man", "20-30", "Not needed", 24, 5, "7 days", "c07"],
    ["Morning routine, just woke up", "video", 5, 60, "Anyone", "18-30", "Optional", 72, 48, "30 days", "c11"],
    ["Good night voice note, with my name", "voice", 2, 25, "Woman", "20-35", "Not needed", 24, 9, "Forever", "c17"],
    ["Your own idea, surprise me", "custom", 8, 80, "Anyone", "18-35", "Optional", 72, 24, "1 year", "c26"],
    ["After the match, still in kit", "video", 6, 75, "Man", "20-28", "Not needed", 48, 20, "30 days", "c08"],
    ["Steamy mirror, slow and quiet", "video", 7, 85, "Man", "20-30", "Not needed", 48, 6, "30 days", "c03"],
    ["Casual mirror selfies, outfit check", "photos", 5, 30, "Woman", "18-30", "Optional", 24, 4, "7 days", "c21"],
    ["Home gym session, phone on tripod", "video", 12, 110, "Man", "22-32", "Optional", 72, 26, "1 year", "c06"],
    ["Late night chat, just us", "voice", 5, 40, "Anyone", "20-35", "Not needed", 24, 3, "30 days", "c16"],
    ["Evening self care routine", "video", 4, 50, "Anyone", "20-35", "Optional", 48, 12, "30 days", "c13"],
    ["Fresh sneakers, unboxing photos", "photos", 6, 35, "Man", "18-28", "Not needed", 48, 18, "7 days", "c23"],
    ["Ring light shoot, your concept", "custom", 10, 120, "Anyone", "21-35", "Optional", 168, 72, "1 year", "c25"],
    ["After the shower, wet footprints", "photos", 6, 40, "Man", "18-25", "Not needed", 24, 8, "30 days", "c02"],
    ["Good morning message with coffee", "voice", 1, 15, "Anyone", "18-35", "Not needed", 24, 10, "Forever", "c15"],
    ["Celebration clip for my birthday", "custom", 3, 45, "Anyone", "18-30", "Optional", 72, 47, "Forever", "c30"],
    ["Denim and cap, fit check", "photos", 4, 25, "Man", "18-25", "Optional", 24, 7, "7 days", "c24"],
    ["Rainy window, voice and city sounds", "voice", 3, 30, "Anyone", "20-35", "Not needed", 48, 30, "30 days", "c20"],
  ];
  const owners = ["k_22", "sam_x", "j_m", "lou", "tide", "rook"];
  const reqs = await db.insert(S.requests).values(rows.map((r, i) => {
    const [a, b] = r[5].split("-").map(Number);
    return { buyerId: byH[owners[i % owners.length]].id, title: r[0], category: r[1], amount: r[2], dealCents: r[3] * 100, who: r[4], ageMin: a, ageMax: b,
      face: FACE[r[6]], dueHours: r[7], closesAt: H(r[8]), minVault: VP[r[9]], cover: r[10], createdAt: H(-(i * 3 + 1)) };
  })).returning();
  /* some competition on public requests */
  const pool = ["jens", "sem", "noah", "ava.r", "lina.m", "dre", "ruby"];
  const offs: (typeof S.offers.$inferInsert)[] = [];
  reqs.forEach((r, i) => { for (let k = 0; k < 2 + (i % 4); k++) { const c = cr[pool[(i + k) % pool.length]]; offs.push({ requestId: r.id, creatorId: c.id, showsFace: false, vault: r.minVault, etaHours: Math.min(r.dueHours, 24), note: "Can do this." }); } });
  await db.insert(S.offers).values(offs).onConflictDoNothing();

  /* the demo buyer's own open request with four offers */
  const [mine] = await db.insert(S.requests).values({ buyerId: byH.nightowl.id, title: "Shower video, 10 minutes", details: "Calm and natural. Steam, soft light, no talking needed.", category: "video", amount: 10, dealCents: 10000, who: "Man", ageMin: 18, ageMax: 30, face: "not_needed", minVault: "30d", dueHours: 48, closesAt: H(14), cover: "c05" }).returning();
  await db.insert(S.offers).values([
    { requestId: mine.id, creatorId: cr.milo.id, showsFace: false, vault: "30d", etaHours: 30, note: "Can deliver tomorrow evening. Natural light, no face." },
    { requestId: mine.id, creatorId: cr.jens.id, showsFace: true, vault: "30d", etaHours: 48, note: "Happy to do it, face included if you like." },
    { requestId: mine.id, creatorId: cr.noah.id, showsFace: false, vault: "1y", etaHours: 24, note: "First time here, ID verified. Can do it today." },
    { requestId: mine.id, creatorId: cr.sem.id, showsFace: false, vault: "forever", etaHours: 12, note: "Tonight works for me." },
  ]);

  /* a finished photo deal for the demo buyer, with real files in the vault */
  const past = async (buyer: string, creator: string, title: string, cat: "photos" | "video" | "voice", amount: number, euro: number, cover: string, hoursAgo: number, took: number, files = 0) => {
    const [r] = await db.insert(S.requests).values({ buyerId: byH[buyer].id, title, category: cat, amount, dealCents: euro * 100, who: "Man", ageMin: 18, ageMax: 30, face: "not_needed", minVault: "30d", dueHours: 48, closesAt: H(-hoursAgo), cover, status: "matched", createdAt: H(-hoursAgo - took - 2) }).returning();
    const [o] = await db.insert(S.offers).values({ requestId: r.id, creatorId: cr[creator].id, showsFace: false, vault: "30d", etaHours: 48, note: "", status: "accepted" }).returning();
    const m = split(r.dealCents);
    const deliveredAt = H(-hoursAgo), created = H(-hoursAgo - took);
    const [d] = await db.insert(S.deals).values({ requestId: r.id, offerId: o.id, buyerId: byH[buyer].id, creatorId: cr[creator].id, dealCents: m.dealCents, feeCents: m.feeCents, creatorCents: m.creatorCents, paymentRef: "seed", status: "released", dueAt: addHours(created, 48), deliveredAt, objectUntil: addHours(deliveredAt, 24), settledAt: addHours(deliveredAt, 24), createdAt: created, buyerRating: 5 }).returning();
    await db.insert(S.ledger).values([{ dealId: d.id, userId: byH[buyer].id, entry: "buyer_charge", cents: m.buyerPays, createdAt: created }, { dealId: d.id, userId: cr[creator].id, entry: "creator_payout", cents: m.creatorCents, createdAt: addHours(deliveredAt, 24) }, { dealId: d.id, entry: "platform_revenue", cents: m.platformCents, createdAt: addHours(deliveredAt, 24) }]);
    await db.insert(S.messages).values([{ dealId: d.id, kind: "system", body: "Offer accepted. The money is held by the payment partner until delivery.", createdAt: created }, { dealId: d.id, kind: "system", body: "Delivered. The automatic check passed and it is in the buyer's vault.", createdAt: deliveredAt }, { dealId: d.id, kind: "system", body: "Payment released to the creator.", createdAt: addHours(deliveredAt, 24) }]);
    const mids: string[] = [];
    for (let i = 0; i < files; i++) {
      const src = await readFile(path.resolve("public/img", `c${String(((i * 5 + 7) % 30) + 1).padStart(2, "0")}.webp`));
      const jpg = await sharp(src).resize(1200, 1800, { fit: "cover" }).jpeg({ quality: 86 }).toBuffer();
      const key = `seed/${d.id}-${i}.jpg`;
      await mkdir(path.join(storage, "seed"), { recursive: true });
      await sharp(jpg).toFile(path.join(storage, key));
      const [md] = await db.insert(S.media).values({ ownerId: cr[creator].id, storageKey: key, mime: "image/jpeg", bytes: jpg.length, width: 1200, height: 1800 }).returning();
      mids.push(md.id);
    }
    const [dl] = await db.insert(S.deliveries).values({ dealId: d.id, creatorId: cr[creator].id, mediaIds: mids, technical: [{ ok: true, text: "Seeded" }], onlyCreator: true, review: "approved", reviewedBy: "seed", reviewedAt: deliveredAt, createdAt: deliveredAt }).returning();
    if (mids.length) await db.insert(S.vaultItems).values(mids.map((m, i) => ({ dealId: d.id, buyerId: byH[buyer].id, mediaId: m, deliveryId: dl.id, position: i, availableUntil: vaultUntil(deliveredAt, "30d") })));
    return d;
  };
  await past("nightowl", "sem", "Post workout photo set", "photos", 6, 40, "c10", 30, 9, 6);
  await past("nightowl", "jens", "Denim and cap, fit check", "photos", 4, 25, "c22", 80, 5, 4);
  const hist: [string, string, string, "photos" | "video" | "voice", number, number, string, number, number][] = [
    ["k_22", "milo", "Shower video, 8 minutes", "video", 8, 90, "c04", 2, 6], ["sam_x", "ava.r", "Outfit check, 5 photos", "photos", 5, 30, "c21", 5, 3],
    ["lou", "lina.m", "Good night voice note", "voice", 2, 25, "c18", 7, 2], ["j_m", "dre", "Birthday message", "voice", 2, 35, "c19", 11, 4],
    ["tide", "milo", "Morning routine", "video", 5, 60, "c12", 16, 9], ["rook", "ruby", "Fit check, 4 photos", "photos", 4, 25, "c24", 20, 3],
    ["k_22", "sem", "Gym session, 10 minutes", "video", 10, 100, "c09", 26, 14], ["sam_x", "jens", "Mirror selfies", "photos", 5, 30, "c23", 33, 6],
  ];
  for (const h of hist) await past(...h);

  console.log(`Seeded ${buyers.length + creators.length} users, ${reqs.length + 1} open requests, ${hist.length + 2} completed deals.`);
  process.exit(0);
}
/* Hosting without a persistent disk loses files on restart. Seeded vault files are rebuilt from
   the public images so the demo keeps working; real uploads need a disk or object storage. */
async function repairSeedMedia() {
  const storage = path.resolve(process.env.STORAGE_DIR || "./storage");
  const rows = await db.select().from(S.media).where(sql`${S.media.storageKey} like 'seed/%'`);
  let fixed = 0;
  for (const [i, m] of rows.entries()) {
    const p = path.join(storage, m.storageKey);
    try { await readFile(p); continue; } catch {}
    await mkdir(path.dirname(p), { recursive: true });
    const src = await readFile(path.resolve("public/img", `c${String(((i * 5 + 7) % 30) + 1).padStart(2, "0")}.webp`));
    await sharp(src).resize(1200, 1800, { fit: "cover" }).jpeg({ quality: 86 }).toFile(p);
    fixed++;
  }
  if (fixed) console.log(`Rebuilt ${fixed} seeded media files.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
