/* Demo mode only (test environment, see DEMO_MODE): fills the demo with fictional life, so the
   site can be shown the way it will work. All of it sits on demo accounts and is removed before
   launch. Idempotent: runs at every start and only tops up what is missing.
   1. Only creators with a 3D avatar take part; the others are hidden from the demo.
   2. Each creator gets a history of finished deals with ratings and written reviews.
   3. The open requests get offers from creators who fit. */
import "dotenv/config";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db, schema as S } from "../src/db";

if (process.env.BRQ_PROVIDER_ENV === "live" || process.env.BRQ_DEMO === "0") { console.log("Demo life: skipped, not a demo environment."); process.exit(0); }

type Lang = "nl" | "fr" | "en";
const CREATORS: Record<string, { reviews: number; who: "Man" | "Woman" | "Anyone"; cats: string[] }> = {
  "ava.r": { reviews: 14, who: "Woman", cats: ["video", "photos", "custom"] },
  milo: { reviews: 11, who: "Man", cats: ["video", "photos", "voice"] },
  "lina.m": { reviews: 9, who: "Woman", cats: ["voice", "photos", "custom"] },
  ruby: { reviews: 10, who: "Woman", cats: ["video", "photos", "custom"] },
  "kai.v": { reviews: 8, who: "Anyone", cats: ["voice", "photos", "custom"] },
  jens: { reviews: 8, who: "Man", cats: ["video", "photos", "custom"] },
  nour: { reviews: 9, who: "Woman", cats: ["voice", "custom"] },
  dre: { reviews: 7, who: "Man", cats: ["voice", "video", "custom"] },
  sem: { reviews: 8, who: "Man", cats: ["video", "voice", "photos"] },
  noah: { reviews: 3, who: "Man", cats: ["video", "photos"] },
};

/* Written like people write: short, long, typos, emoji, three languages. Each one is used once. */
const REVIEWS: [number, Lang, string][] = [
  [5, "nl", "Echt top. Precies wat ik vroeg en zelfs iets meer. Zou zeker opnieuw bestellen"],
  [5, "en", "honestly better than i expected. super natural, no awkward acting at all"],
  [5, "fr", "Parfait, rapide et très naturel. Merci !!"],
  [4, "nl", "Goed gedaan, licht was een beetje donker maar verder prima"],
  [5, "en", "Delivered a day early and the vibe was exactly right. 10/10"],
  [5, "nl", "super lief en duidelijk gecommuniceerd in de chat. aanrader 👌"],
  [5, "fr", "Je recommande à 100%. Le message vocal m'a fait sourire toute la journée"],
  [3, "en", "It was ok. A bit shorter than the minutes I asked, but they fixed it when I said so"],
  [5, "nl", "Wauw. Heel mooi gefilmd, rustig, geen haast. Dit is waarvoor ik betaal"],
  [5, "en", "Kind, quick, discreet. Exactly how this should work"],
  [4, "fr", "Très bien, juste un peu de bruit en fond mais rien de grave"],
  [5, "nl", "Voor de tweede keer besteld en weer even goed"],
  [5, "en", "the voice note is on repeat lol. thank you"],
  [5, "nl", "Heel natuurlijk en eerlijk. Je voelt dat het niet gespeeld is"],
  [4, "en", "Good stuff, would have liked one more photo angle but happy overall"],
  [5, "fr", "Super créatif, j'ai laissé carte blanche et c'était top"],
  [5, "nl", "Snel geleverd, mooie kwaliteit, en heel discreet. Dikke merci"],
  [5, "en", "Followed every detail of my request. Rare. Thanks a lot"],
  [5, "nl", "had een rotweek en dit maakte mijn avond goed"],
  [4, "nl", "Mooi gedaan. Iets later dan gepland maar netjes laten weten"],
  [5, "en", "Perfect morning routine video, felt like i was there"],
  [5, "fr", "Rien à redire. Simple, efficace, naturel"],
  [5, "nl", "Precies de sfeer die ik in mijn hoofd had. Knap"],
  [5, "en", "great energy, made me laugh. 5 stars easy"],
  [4, "fr", "Bien mais j'aurais aimé un peu plus de lumière. Sinon top"],
  [5, "nl", "Top creator, fijn contact en levert wat er gevraagd wordt"],
  [5, "en", "Already asked for another one. That says enough i think"],
  [5, "nl", "Heel mooie foto's, echt in volle kwaliteit 🔥"],
  [3, "nl", "Oké, maar niet helemaal wat ik bedoelde. Wel vriendelijk en snel"],
  [5, "en", "Sweet, warm voice and said my name perfectly"],
  [5, "fr", "Livré en avance et exactement ce que je voulais, merci beaucoup"],
  [5, "nl", "Geen gedoe, gewoon goed. Zo hoort het"],
  [4, "en", "Nice! audio could be a little louder next time"],
  [5, "nl", "Ik was eerst wat zenuwachtig om iets te vragen maar dit voelde heel veilig"],
  [5, "en", "Gym vibe on point. Delivered within 12 hours"],
  [5, "fr", "Très pro et en même temps très naturel. Je reviendrai"],
  [5, "nl", "Mega blij mee, echt mijn geld waard"],
  [5, "en", "Took my weird idea seriously and made it work. Respect"],
  [4, "nl", "Goed, alleen de video was 1 min korter. Kreeg er wel een extra foto bij"],
  [5, "en", "Calm, relaxed, beautiful light. Exactly what i needed after work"],
  [5, "fr", "Une voix magnifique, j'en redemande"],
  [5, "nl", "Heel fijn dat het gezicht niet nodig was en toch zo persoonlijk aanvoelde"],
  [5, "en", "5/5 would request again"],
  [5, "nl", "echt een aanrader!! snel, lief en precies wat ik vroeg"],
  [4, "fr", "Bonne expérience. Un peu de retard mais prévenu dans le chat"],
  [5, "en", "So natural. No script, no fake vibes. Love it"],
  [5, "nl", "Fit check was super handig haha, eindelijk een outfit gekozen"],
  [5, "en", "Fast and lovely. thank youuu"],
  [5, "nl", "Rustig, warm en eerlijk. Precies wat ik zocht"],
  [5, "fr", "Top du début à la fin. Communication parfaite"],
  [4, "en", "Really good, just a little shaky camera at the start"],
  [5, "nl", "Heel mooi werk. Respectvol en duidelijk"],
  [5, "en", "this was my first request ever and it was such a good experience"],
  [5, "nl", "Kwaliteit is top, leveren ging snel. Volgende keer langere versie"],
  [5, "fr", "Exactement ce que j'avais demandé, avec une petite touche perso en plus"],
  [3, "en", "Fine but felt a bit rushed. Still delivered on time"],
  [5, "nl", "Mijn favoriet op ByRequest tot nu toe"],
  [5, "en", "Perfect for falling asleep. Will be back"],
  [5, "nl", "Grappig, spontaan en heel natuurlijk. Top"],
  [4, "nl", "Prima, goede communicatie. Licht kon iets beter"],
  [5, "en", "Very creative take on my request. Loved the details"],
  [5, "fr", "Très gentil(le) et très réactif. Merci encore"],
  [5, "nl", "Superrr, precies op tijd en mooi gedaan"],
  [5, "en", "Discreet, quick and kind. Exactly as promised"],
  [5, "nl", "Ik had weinig uitleg gegeven en toch raak. Knap gedaan"],
  [4, "en", "Pretty great. Would love a bit more talking next time"],
  [5, "fr", "Ambiance parfaite, lumière douce, rien à redire"],
  [5, "nl", "Al drie keer besteld, altijd even goed"],
  [5, "en", "Super professional and still felt personal"],
  [5, "nl", "Precies wat er in de beschrijving stond. Bedankt!"],
  [5, "en", "goodnight message was adorable 😭"],
  [5, "fr", "Je ne m'attendais pas à autant de qualité. Bravo"],
  [4, "nl", "Goed gedaan, de muziek op de achtergrond was iets te luid"],
  [5, "en", "Top tier. Fast reply, fast delivery"],
  [5, "nl", "Heel tevreden, voelt echt persoonlijk"],
  [5, "en", "Made it exactly the length I asked, with great light"],
  [5, "fr", "Super expérience, très facile et rassurant"],
  [5, "nl", "Eerlijk, warm en grappig. Zeker opnieuw"],
  [4, "en", "Good overall, small mixup on the outfit but sorted quickly"],
  [5, "nl", "Perfect gedaan, dankjewel!"],
  [5, "en", "Honest, natural and really kind in the chat"],
  [5, "fr", "Parfait comme d'habitude"],
  [5, "nl", "Mooie sfeer, ik werd er echt rustig van"],
  [5, "en", "Smooth from start to finish. Recommended"],
  [5, "nl", "Snelle levering en heel mooi resultaat"],
  [5, "en", "nailed it. exactly what i had in mind"],
  [5, "nl", "Topper. Doet wat je vraagt, met een glimlach"],
];

const TITLES: Record<string, [Lang, string, number][]> = {
  video: [["nl", "Douche na de training", 10], ["en", "Morning routine, just woke up", 5], ["fr", "Séance de sport à la maison", 8], ["nl", "Rustige avondvideo", 6], ["en", "Gym session, phone on tripod", 10], ["nl", "Koffie in bed, geen haast", 5], ["en", "Slow shower, warm light", 12], ["fr", "Réveil tranquille", 6]],
  photos: [["nl", "Outfit check, 5 foto's", 5], ["en", "Post workout photo set", 6], ["fr", "Tenue du soir, 8 photos", 8], ["nl", "Luie zondag fotoset", 8], ["en", "Mirror selfies after the gym", 6], ["en", "Fit check for a date", 5]],
  voice: [["nl", "Slaapwel berichtje met mijn naam", 2], ["en", "Good morning voice note", 2], ["fr", "Message vocal pour m'endormir", 3], ["en", "Read me a short story", 5], ["nl", "Iemand die vertelt over zijn dag", 4]],
  custom: [["en", "Birthday message, your way", 5], ["nl", "Verras me met je eigen idee", 6], ["fr", "Petite vidéo rien que pour moi", 5], ["en", "Cook for me and talk to me", 6], ["nl", "Iets grappigs voor een rotdag", 3]],
};

const NOTES: Record<Lang, string[]> = {
  nl: ["Kan morgenavond leveren, rustig licht.", "Leuk idee! Ik maak het zoals jij het beschrijft.", "Zin in. Kan vandaag nog.", "Heb dit al vaker gedaan, komt goed 🙂", "Ik doe het zonder gezicht, wel heel persoonlijk.", "Graag! Laat gerust weten als je nog iets extra wil."],
  fr: ["Je peux livrer demain soir, lumière douce.", "Avec plaisir, je le fais comme tu le décris.", "Disponible aujourd'hui même.", "J'adore l'idée, ça va être top 🙂", "Sans visage mais très personnel."],
  en: ["Can deliver tomorrow evening, soft light.", "Love this idea, I'll do it just like you describe.", "Can do it today.", "Done this before, you'll like it 🙂", "No face, but very personal.", "Happy to! Tell me if you want anything extra."],
};

const rnd = (seed: number) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

async function main() {
  const r = rnd(42);
  const creators = await db.select().from(S.users).where(and(eq(S.users.isCreator, true), like(S.users.email, "%@demo.byrequest.app")));
  const byHandle = Object.fromEntries(creators.map((c) => [c.handle, c]));
  // 1. Only creators with a 3D avatar take part in the demo.
  const hidden = creators.filter((c) => !CREATORS[c.handle] || c.avatar?.kind !== "3d").map((c) => c.id);
  if (hidden.length) {
    await db.update(S.creatorProfiles).set({ visibility: "offer_only" }).where(inArray(S.creatorProfiles.userId, hidden));
    await db.delete(S.offers).where(and(inArray(S.offers.creatorId, hidden), eq(S.offers.status, "pending")));
  }
  for (const h of ["sem", "milo"]) if (byHandle[h]) await db.update(S.creatorProfiles).set({ visibility: "public" }).where(eq(S.creatorProfiles.userId, byHandle[h].id));

  // 2. Finished deals with reviews. Buyers are the team profiles and the demo buyers.
  const buyers = await db.select({ id: S.users.id, handle: S.users.handle }).from(S.users).where(sql`${S.users.house} or (${S.users.email} like '%@demo.byrequest.app' and not ${S.users.isCreator} and ${S.users.handle} not in ('ops', 'nightowl'))`);
  const used = new Set((await db.select({ t: S.deals.reviewText }).from(S.deals).where(sql`${S.deals.reviewText} is not null`)).map((x) => x.t));
  const pool = REVIEWS.filter(([, , t]) => !used.has(t));
  let added = 0;
  for (const [handle, cfg] of Object.entries(CREATORS)) {
    const c = byHandle[handle];
    if (!c) continue;
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(S.deals).where(and(eq(S.deals.creatorId, c.id), like(S.deals.paymentRef, "demo_rev_%")));
    for (let i = n; i < cfg.reviews && pool.length; i++) {
      const [stars, , text] = pool.shift()!;
      const cat = cfg.cats[i % cfg.cats.length];
      const [lang, title, amount] = TITLES[cat][Math.floor(r() * TITLES[cat].length)];
      const buyer = buyers[Math.floor(r() * buyers.length)];
      const euros = [25, 30, 35, 40, 45, 55, 60, 75, 90, 110][Math.floor(r() * 10)];
      const dealCents = euros * 100, feeCents = Math.round(dealCents * 0.1), creatorCents = Math.round(dealCents * 0.8);
      const settled = new Date(Date.now() - (2 + i * (5 + Math.floor(r() * 6))) * 86_400_000 - Math.floor(r() * 20) * 3600_000);
      const created = new Date(settled.getTime() - (30 + Math.floor(r() * 40)) * 3600_000);
      await db.transaction(async (tx) => {
        const [rq] = await tx.insert(S.requests).values({ buyerId: buyer.id, title, details: "", category: cat as "video", amount, dealCents, who: cfg.who, ageMin: 21, ageMax: 45, lang, status: "matched", createdAt: created, closesAt: new Date(created.getTime() + 24 * 3600_000) }).returning();
        const [of] = await tx.insert(S.offers).values({ requestId: rq.id, creatorId: c.id, showsFace: false, vault: "30d", etaHours: 24, note: "", status: "accepted", createdAt: created }).returning();
        const [d] = await tx.insert(S.deals).values({ requestId: rq.id, offerId: of.id, buyerId: buyer.id, creatorId: c.id, dealCents, feeCents, creatorCents, paymentRef: `demo_rev_${c.handle}_${i}`, status: "released",
          dueAt: new Date(created.getTime() + 48 * 3600_000), deliveredAt: new Date(settled.getTime() - 24 * 3600_000), objectUntil: settled, settledAt: settled, buyerRating: stars, reviewText: text, createdAt: created }).returning();
        await tx.insert(S.ledger).values([
          { dealId: d.id, userId: buyer.id, entry: "buyer_charge", cents: dealCents + feeCents, createdAt: created },
          { dealId: d.id, userId: c.id, entry: "creator_payout", cents: creatorCents, createdAt: settled },
          { dealId: d.id, entry: "platform_revenue", cents: dealCents + feeCents - creatorCents, createdAt: settled },
        ]);
      });
      added++;
    }
  }

  // 3. Offers on the open requests from creators who fit.
  const open = await db.select().from(S.requests).where(and(eq(S.requests.status, "open"), sql`${S.requests.closesAt} > now()`, sql`${S.requests.buyerId} in (select id from users where house)`));
  let offers = 0;
  const able = Object.entries(CREATORS).filter(([h]) => h !== "noah" && byHandle[h]);
  const order = ["7d", "30d", "1y", "forever"];
  for (const [i, q] of open.entries()) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(S.offers).where(eq(S.offers.requestId, q.id));
    if (n) continue;
    const fit = able.filter(([, cfg]) => (q.who === "Anyone" || cfg.who === q.who || cfg.who === "Anyone") && cfg.cats.includes(q.category));
    const pick = fit.sort(() => r() - 0.5).slice(0, 1 + (i % 4));
    for (const [h] of pick) {
      const c = byHandle[h];
      const prof = await db.query.creatorProfiles.findFirst({ where: eq(S.creatorProfiles.userId, c.id) });
      const vault = order[Math.max(order.indexOf(q.minVault), order.indexOf(prof?.defaultVault ?? "30d"))] as "30d";
      const notes = NOTES[(q.lang as Lang) in NOTES ? (q.lang as Lang) : "en"];
      await db.insert(S.offers).values({ requestId: q.id, creatorId: c.id, showsFace: q.face === "required" ? true : prof?.showsFace ?? false, vault, etaHours: Math.min(q.dueHours, [12, 24, 48][Math.floor(r() * 3)]), note: notes[Math.floor(r() * notes.length)], createdAt: new Date(q.createdAt.getTime() + (20 + Math.floor(r() * 300)) * 60_000) }).onConflictDoNothing();
      offers++;
    }
  }

  // Ratings and deal counts follow the deals.
  await db.execute(sql`update users u set rating_sum = coalesce(x.s, 0), rating_count = coalesce(x.n, 0)
    from (select c.id, sum(d.buyer_rating)::int s, count(d.buyer_rating)::int n from users c left join deals d on d.creator_id = c.id group by c.id) x where x.id = u.id`);
  console.log(`Demo life: ${hidden.length} creators without a 3D avatar hidden, ${added} reviewed deals added, ${offers} offers added.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
