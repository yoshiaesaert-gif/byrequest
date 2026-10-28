/* ByRequest team requests. Thirty team profiles, each with one request and a real budget that
   ByRequest pays when it accepts an offer. Every request is labelled "by ByRequest" under the ad,
   and the back office lists them under Internal requests. Idempotent: runs at every start and only
   adds what is missing. Reviews are never seeded: they come from real deals only. */
import "dotenv/config";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema as S } from "../src/db";
import { createHash } from "node:crypto";
import { chooseFor } from "../src/domain/covers";
import { TEXTS } from "./house-texts";

const trKey = (to: string, text: string) => createHash("sha256").update(`${to}|${text}`).digest("hex");

const ctx: Record<string, unknown> = { window: {}, Math, JSON, Object, Array, String, Number };
vm.createContext(ctx);
vm.runInContext(readFileSync("public/avatar.js", "utf8"), ctx);
const A = (ctx.window as { BRQAvatar: { generate: (q: object) => Record<string, unknown>; svg: (s: object) => string } }).BRQAvatar;

type Cat = "video" | "photos" | "voice" | "custom";
type Face = "not_needed" | "optional" | "required";
type Vault = "7d" | "30d" | "1y" | "forever";
type R = [handle: string, country: string, lang: "nl" | "fr" | "en", cat: Cat, amount: number, euros: number, who: "Man" | "Woman" | "Anyone", ageMin: number, ageMax: number, face: Face, vault: Vault, dueHours: number, title: string, details: string];

const LIST: R[] = [
  ["jeroen_gent", "BE", "nl", "video", 10, 120, "Man", 25, 40, "optional", "30d", 72, "na de fitness, gewoon jezelf", "Zoek iemand die na de training gewoon even filmt hoe je afkoelt, douche mag erbij. Niks geacteerd aub, gewoon zoals je bent. Licht maakt me niet uit."],
  ["lucie.bxl", "BE", "fr", "voice", 3, 45, "Woman", 25, 45, "not_needed", "1y", 48, "Message vocal pour m'endormir", "Une voix douce qui me dit bonne nuit et me raconte ta journée. Tu peux dire mon prénom, Lucie. Pas besoin d'être parfaite, juste naturelle 🙂"],
  ["tomvdb", "BE", "nl", "photos", 6, 60, "Woman", 25, 35, "not_needed", "30d", 48, "outfit check voor zaterdag", "ik moet zaterdag naar een feest en kan niet kiezen lol. stuur 6 fotos van outfits die jij zou dragen, mag ook gewoon in je slaapkamer. eerlijke mening erbij = bonus"],
  ["mark_r", "NL", "en", "video", 5, 75, "Woman", 28, 45, "optional", "30d", 48, "morning coffee, still in bed", "5 min of your slow morning. coffee, messy hair, sunlight. talk to the camera like im there. no script"],
  ["stijn.antwerpen", "BE", "nl", "custom", 8, 150, "Anyone", 21, 40, "optional", "30d", 72, "Verras me met jouw idee", "Ik laat het volledig aan jou over. Wat vind jij zelf leuk om te maken? Hoe creatiever hoe beter. Het budget is serieus bedoeld."],
  ["pieterjan", "BE", "nl", "voice", 2, 30, "Woman", 21, 40, "not_needed", "30d", 48, "Goeiemorgen berichtje", "Zou iemand mij wakker willen maken met een stem? Begin met 1 bericht van 2 min. Vlaams accent is een plus haha"],
  ["julien_lg", "BE", "fr", "video", 8, 110, "Man", 25, 40, "not_needed", "30d", 48, "Séance de sport à la maison", "Je cherche une vidéo de ta séance à la maison, pompes, gainage, ce que tu fais d'habitude. Tél sur trépied c'est parfait. Visage pas nécessaire."],
  ["dennis1987", "NL", "nl", "photos", 10, 90, "Woman", 28, 45, "optional", "1y", 72, "zondagmiddag op de bank", "10 fotos van een luie zondag. dekentje, thee, sokken, je weet wel. mag sexy maar hoeft niet, sfeer is belangrijker"],
  ["alex.w", "NL", "en", "voice", 5, 65, "Man", 25, 45, "not_needed", "30d", 48, "read me something before bed", "deep voice reading a short story or a poem, 5 minutes. your pick. i fall asleep better with someone talking"],
  ["kevin_hasselt", "BE", "nl", "video", 12, 180, "Woman", 25, 38, "optional", "30d", 168, "douche na een lange dag", "Graag een rustige douchevideo van 12 min, stoom, zachte muziek mag. geen haast, deadline is een week. ik betaal goed voor kwaliteit"],
  ["noa.utrecht", "NL", "nl", "video", 6, 80, "Man", 25, 40, "not_needed", "30d", 48, "Na het hardlopen", "Hoi! Ik zoek een korte video na het hardlopen, bezweet shirt uit, beetje uithijgen, water drinken. Gewoon echt. Hoeft geen gezicht."],
  ["seb_namur", "BE", "fr", "photos", 8, 70, "Woman", 25, 40, "optional", "30d", 72, "tenue de soirée, 8 photos", "8 photos dans ta plus belle tenue avant de sortir. Miroir, lumière tamisée. Si tu veux ajouter un petit mot, j'adore"],
  ["bart_k", "BE", "nl", "custom", 5, 95, "Woman", 30, 50, "optional", "30d", 72, "Verjaardagsfilmpje voor mezelf", "Klinkt misschien raar maar ik word 41 en wil gewoon iets speciaals voor mezelf. 5 min, jij zegt gelukkige verjaardag Bart en de rest mag je zelf invullen"],
  ["ryan.ams", "NL", "en", "photos", 12, 140, "Man", 25, 40, "optional", "1y", 72, "gym mirror set", "12 pics in the changing room or at home in front of the mirror after training. the pump is the point lol. face optional"],
  ["wout", "BE", "nl", "voice", 4, 50, "Anyone", 21, 45, "not_needed", "30d", 48, "iemand om tegen te praten", "Geen idee hoe dit werkt eigenlijk. Ik wil gewoon een voice note waarin iemand vertelt over z'n dag, alsof we samenwonen. 4 min ofzo"],
  ["maxime.c", "BE", "fr", "video", 10, 130, "Woman", 25, 40, "optional", "30d", 72, "routine du soir, tranquille", "Ta routine du soir : démaquillage, crème, pyjama. 10 minutes, calme, comme si j'étais dans la pièce. Pas de mise en scène svp"],
  ["thomas_lv", "BE", "nl", "video", 3, 45, "Man", 25, 40, "not_needed", "7d", 24, "korte flex video", "kort en simpel, 3 min flexen na je training. snel nodig, vandaag of morgen"],
  ["dave_eindhoven", "NL", "nl", "photos", 5, 55, "Woman", 25, 45, "not_needed", "30d", 48, "Sokken en sneakers", "Klein verzoekje: 5 fotos van je benen met witte sokken en sneakers, na het sporten. Geen gezicht nodig. Ja ik weet het haha"],
  ["olivier", "BE", "en", "custom", 10, 200, "Woman", 28, 45, "optional", "1y", 168, "a slow evening, your way", "pour a glass of wine, put on music you like, and just let me be there for 10 minutes. talk, dance, whatever feels right. take your time with it, im paying for quality not speed"],
  ["robbe.leuven", "BE", "nl", "voice", 3, 40, "Woman", 21, 35, "not_needed", "30d", 48, "slaap lekker bericht", "zou iemand me een slaap lekker berichtje kunnen sturen? mag gefluisterd. naam is Robbe. merci!!"],
  ["nico_bx", "BE", "fr", "video", 6, 85, "Man", 28, 45, "optional", "30d", 48, "Réveil, café, pas encore habillé", "Le matin juste réveillé, café, t-shirt, pas encore rasé. 6 min, tu me parles de ton programme du jour. Authentique avant tout"],
  ["jasper_r", "NL", "nl", "photos", 8, 100, "Man", 25, 40, "optional", "1y", 72, "werkoutfit uit en weer aan", "8 fotos van je na het werk, net thuis, overhemd half open, das los. die sfeer. als je een uniform hebt (kok, zorg, bouw) nog beter"],
  ["ben_ghent", "BE", "en", "video", 15, 220, "Woman", 25, 40, "optional", "30d", 168, "long shower, no rush", "15 minutes. warm light, steam, music if you want. no talking needed. happy to wait a week for something done properly"],
  ["koen_brugge", "BE", "nl", "custom", 6, 90, "Anyone", 25, 45, "optional", "30d", 72, "Kook voor me", "Leuk idee denk ik: film jezelf terwijl je iets kookt in een schort, en praat tegen me alsof ik aan tafel zit. 6 minuten. Wat je eronder draagt mag je zelf weten ;)"],
  ["antoine_l", "BE", "fr", "voice", 5, 60, "Man", 25, 45, "not_needed", "1y", 48, "Ta voix au réveil", "Message vocal de 5 min, la voix encore endormie du matin. Raconte moi ton rêve ou ce que tu veux. J'adore les accents"],
  ["sven", "NL", "nl", "video", 8, 120, "Woman", 25, 40, "optional", "30d", 72, "Yoga in de woonkamer", "Rustige yoga sessie van 8 min in je woonkamer, sportkleding, ochtendlicht als dat lukt. Geen gepraat nodig, ademhaling is genoeg"],
  ["mike_tilburg", "NL", "nl", "photos", 6, 65, "Man", 25, 40, "not_needed", "30d", 48, "net uit de douche", "6 fotos net na het douchen, handdoek, natte haren, beslagen spiegel. geen gezicht nodig. vriendelijk en netjes graag"],
  ["lars", "NL", "en", "video", 5, 70, "Man", 25, 40, "optional", "30d", 48, "post game, still in kit", "just played a match? 5 min in your kit, muddy is fine, tell me how the game went. football rugby hockey whatever"],
  ["yannick.charleroi", "BE", "fr", "custom", 5, 75, "Woman", 25, 45, "optional", "30d", 72, "Petit message rien que pour moi", "Je vis seul en ce moment et je voudrais une petite vidéo juste pour moi. 5 min, mignon, un peu taquin. Merci d'avance"],
  ["joris.nl", "NL", "nl", "voice", 2, 35, "Man", 25, 45, "not_needed", "30d", 24, "even een compliment", "Rare vraag misschien. Ik heb een rotweek. 2 min iemand die zegt dat het goed komt en dat ik het goed doe. Geen gedoe. Dankje"],
];

async function main() {
  let people = 0, posted = 0;
  const open = await db.select({ cover: S.requests.cover }).from(S.requests).where(eq(S.requests.status, "open"));
  const usage: Record<string, number> = {}; const recent: string[] = [];
  for (const o of open) if (o.cover) usage[o.cover] = (usage[o.cover] ?? 0) + 1;
  let rewritten = 0;
  for (const [i, [handle, country, lang, cat, amount, eur, who, ageMin, ageMax, face, vault, dueHours, ...orig]] of LIST.entries()) {
    const tx = TEXTS[handle];
    const [title, details] = tx ? tx[lang] : orig;
    // Hand translations go straight into the translation cache, so every language reads natively.
    if (tx) for (const to of ["nl", "en", "fr"] as const) {
      if (to === lang) continue;
      for (const [k, src] of [[0, title], [1, details]] as const)
        await db.insert(S.translations).values({ key: trKey(to, src), source: lang, target: to, text: tx[to][k], provider: "manual" })
          .onConflictDoUpdate({ target: S.translations.key, set: { text: tx[to][k], provider: "manual" } });
    }
    let u = await db.query.users.findFirst({ where: eq(S.users.handle, handle) });
    if (u && !u.house) continue;                       // never take over a real person's username
    if (!u) {
      const spec = A.generate({ age: "25 to 34", pres: i % 3 === 0 ? "Woman" : "Man", len: "Surprise me", style: "Casual", facial: "Any", glasses: "Any", skin: -1 });
      [u] = await db.insert(S.users).values({
        email: `house+${handle.replace(/\W/g, "")}@byrequest.app`, handle, birthYear: 1980 + (i % 15), country, house: true,
        avatar: { kind: "built", spec, svg: A.svg(spec) }, ageVerifiedAt: new Date(), sensitiveConsentAt: new Date(),
      }).returning();
      people++;
    }
    const has = await db.query.requests.findFirst({ where: and(eq(S.requests.buyerId, u.id), inArray(S.requests.status, ["open", "matched"])) });
    if (has) {
      if (has.status === "open" && (has.title !== title || has.details !== details)) { await db.update(S.requests).set({ title, details }).where(eq(S.requests.id, has.id)); rewritten++; }
      continue;
    }
    const cover = chooseFor(cat, title, usage, recent.slice(-3));
    if (cover) { usage[cover] = (usage[cover] ?? 0) + 1; recent.push(cover); }
    const created = new Date(Date.now() - (i * 47 + 13) * 60_000);       // spread over the last day
    await db.insert(S.requests).values({
      buyerId: u.id, title, details, category: cat, amount, dealCents: eur * 100, who, ageMin, ageMax, face, minVault: vault, dueHours,
      cover, lang, createdAt: created, closesAt: new Date(created.getTime() + (48 + (i % 5) * 24) * 3600_000),
    });
    posted++;
  }
  console.log(`House requests: ${people} team profiles added, ${posted} requests posted, ${rewritten} rewritten.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
