import "server-only";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { access, log } from "./onboarding";
import { codeFor, getConfig } from "./referrals";
import { topBudgets, verifiedCreators } from "./queries";
import { CREATOR_SHARE, CAT_LABEL } from "@/domain/rules";
import { deliver, SITE, unsubToken, type Mail, type Theme } from "./mailkit";

const { users, emailLog, offers } = schema;

/* Automatic emails. Each kind goes once per person, never two emails within 24 hours, never to people
   who switched them off, and only between 10:00 and 21:00 Brussels time: the worker tries again every
   minute, so a mail that is due at night simply goes out the next morning. */
export const KINDS = ["invite_24h", "creator_setup", "creator_first_apply", "buyer_first_request", "winback_14d"] as const;
export type Kind = (typeof KINDS)[number];
type Lang = "nl" | "en" | "fr";
const H = 3600_000, D = 24 * H;

export function brusselsHour(now: Date) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour: "numeric", hourCycle: "h23" }).format(now));
}
export const awake = (now: Date) => { const h = brusselsHour(now); return h >= 10 && h < 21; };

const eur = (c: number, l: Lang) => "€" + Math.round(c / 100).toLocaleString(l === "en" ? "en-GB" : "nl-BE");
const cat = (c: string, l: Lang) => ({ video: { nl: "Video", en: "Video", fr: "Vidéo" }, photos: { nl: "Foto's", en: "Photos", fr: "Photos" }, voice: { nl: "Voice note", en: "Voice note", fr: "Message vocal" }, custom: { nl: "Op maat", en: "Custom", fr: "Sur mesure" }, worn: { nl: "Gedragen", en: "Worn", fr: "Porté" } } as Record<string, Record<Lang, string>>)[c]?.[l] ?? CAT_LABEL[c as "video"];

const FOOT: Record<Lang, { why: string; unsub: string; rights: string }> = {
  nl: { why: "Je krijgt deze e-mail omdat je een account hebt op ByRequest. Geen tips en herinneringen meer?", unsub: "Uitschrijven", rights: "Alle rechten voorbehouden" },
  en: { why: "You get this email because you have a ByRequest account. No more tips and reminders?", unsub: "Unsubscribe", rights: "All rights reserved" },
  fr: { why: "Tu reçois cet e-mail car tu as un compte ByRequest. Plus de conseils ni de rappels ?", unsub: "Se désinscrire", rights: "Tous droits réservés" },
};

type Ctx = { lang: Lang; userId: string; handle: string };
type Built = { subject: string; mail: Mail };

/* The content. Subjects and preview lines stay neutral: they show on lock screens. */
async function build(kind: Kind, c: Ctx): Promise<Built> {
  const l = c.lang, foot = { ...FOOT[l], unsubUrl: `${SITE}/u/${unsubToken(c.userId)}` };
  const base = (theme: Theme) => ({ lang: l, theme, footer: foot });
  if (kind === "invite_24h") {
    const [cfg, code] = await Promise.all([getConfig(), codeFor(c.userId)]);
    const example = 100000, bonus = Math.round(example * cfg.creatorPct / 100);
    const T = {
      nl: { s: "Je persoonlijke code staat klaar", p: `Verdien ${cfg.creatorPct}% bij elke vriend die creëert`, k: "Nodig vrienden uit", t: `Verdien ${eur(bonus, l)} met één vriend.`, i: `Breng een vriend mee die creator wordt en jij krijgt ${cfg.creatorPct}% bonus op alles wat die verdient in de eerste ${cfg.windowDays} dagen. ByRequest betaalt het, je vriend houdt alles${cfg.welcomePct ? ` en krijgt zelf ${cfg.welcomePct}% extra op de eerste deal` : ""}.`, bl: "jouw bonus", bn: `als je vriend ${eur(example, l)} verdient in de eerste maand. Elke maandag op je bonussaldo.`, r: [["Vriend die creëert", `${cfg.creatorPct}% voor jou`], ...(cfg.buyerGift ? [["Vriend die koopt", "gratis servicekost voor jullie allebei"]] : [])], cta: "Deel je link", a: "Volledig discreet: je ziet nooit wie zich aanmeldt of wat iemand verdient. Alleen je weekbonus." },
      en: { s: "Your personal code is ready", p: `Earn ${cfg.creatorPct}% on every friend who creates`, k: "Invite friends", t: `Earn ${eur(bonus, l)} with one friend.`, i: `Bring a friend who becomes a creator and you get a ${cfg.creatorPct}% bonus on everything they earn in their first ${cfg.windowDays} days. ByRequest pays it, your friend keeps everything${cfg.welcomePct ? ` and gets ${cfg.welcomePct}% extra on their first deal` : ""}.`, bl: "your bonus", bn: `when your friend earns ${eur(example, l)} in their first month. On your bonus balance every Monday.`, r: [["A friend who creates", `${cfg.creatorPct}% for you`], ...(cfg.buyerGift ? [["A friend who buys", "a free service fee for both of you"]] : [])], cta: "Share your link", a: "Fully discreet: you never see who joins or what anyone earns. Only your weekly bonus." },
      fr: { s: "Ton code personnel est prêt", p: `Gagne ${cfg.creatorPct} % sur chaque ami qui crée`, k: "Invite des amis", t: `Gagne ${eur(bonus, l)} avec un seul ami.`, i: `Amène un ami qui devient créateur et tu reçois ${cfg.creatorPct} % de bonus sur tout ce qu’il gagne pendant ses ${cfg.windowDays} premiers jours. ByRequest le paie, ton ami garde tout${cfg.welcomePct ? ` et reçoit ${cfg.welcomePct} % en plus sur son premier deal` : ""}.`, bl: "ton bonus", bn: `si ton ami gagne ${eur(example, l)} le premier mois. Sur ton solde bonus chaque lundi.`, r: [["Un ami qui crée", `${cfg.creatorPct} % pour toi`], ...(cfg.buyerGift ? [["Un ami qui achète", "frais de service offerts pour vous deux"]] : [])], cta: "Partage ton lien", a: "Totalement discret : tu ne vois jamais qui s’inscrit ni ce que quelqu’un gagne. Seulement ton bonus de la semaine." },
    }[l];
    return { subject: T.s, mail: { ...base("warm"), preheader: T.p, kicker: T.k, title: T.t, intro: T.i, big: { value: eur(bonus, l), label: T.bl, note: T.bn }, rows: T.r as [string, string][], code, cta: { label: T.cta, href: `${SITE}/invite` }, after: T.a } };
  }
  if (kind === "creator_setup") {
    const top = await topBudgets(3, c.userId);
    const rows = top.map((r) => [`${cat(r.category, l)} · ${r.amount}`, `${eur(Math.round(r.dealCents * CREATOR_SHARE), l)}`] as [string, string]);
    const T = {
      nl: { s: "Nog één stap", p: "Je verificatie duurt ongeveer 5 minuten", k: "Bijna klaar", t: "Vijf minuten en je kunt verdienen.", i: "Je account staat klaar. Rond je verificatie af (ID en selfie, privé en versleuteld) en je kunt je meteen kandidaat stellen voor requests. Je naam en ID zie je nergens terug op je profiel.", bl: "wat je kunt verdienen op de top requests van vandaag", cta: "Rond je verificatie af", a: "Je kiest zelf wat je maakt. Met of zonder gezicht, op je eigen moment." },
      en: { s: "One more step", p: "Your verification takes about 5 minutes", k: "Almost there", t: "Five minutes and you can earn.", i: "Your account is ready. Finish your verification (ID and selfie, private and encrypted) and you can apply for requests right away. Your name and ID never show on your profile.", bl: "what you can earn on today's top requests", cta: "Finish your verification", a: "You choose what you make. With or without your face, in your own time." },
      fr: { s: "Plus qu’une étape", p: "Ta vérification prend environ 5 minutes", k: "Presque fini", t: "Cinq minutes et tu peux gagner.", i: "Ton compte est prêt. Termine ta vérification (pièce d’identité et selfie, privés et chiffrés) et tu peux postuler aux demandes tout de suite. Ton nom et ta pièce n’apparaissent jamais sur ton profil.", bl: "ce que tu peux gagner sur les meilleures demandes du jour", cta: "Terminer ma vérification", a: "Tu choisis ce que tu crées. Avec ou sans visage, à ton rythme." },
    }[l];
    return { subject: T.s, mail: { ...base("violet"), preheader: T.p, kicker: T.k, title: T.t, intro: T.i, big: rows.length ? { value: rows[0][1], label: T.bl } : undefined, rows: rows.slice(1), cta: { label: T.cta, href: `${SITE}/onboarding` }, after: T.a } };
  }
  if (kind === "creator_first_apply") {
    const top = await topBudgets(4, c.userId);
    const rows = top.map((r) => [`${cat(r.category, l)} · ${r.amount}`, `${eur(Math.round(r.dealCents * CREATOR_SHARE), l)}`] as [string, string]);
    const sum = top.reduce((s, r) => s + Math.round(r.dealCents * CREATOR_SHARE), 0);
    const T = {
      nl: { s: "Er staan aanvragen voor je klaar", p: "Kies er één en verdien je eerste geld", k: "Je eerste deal", t: "Je eerste geld staat klaar.", i: "Je bent geverifieerd. Kopers wachten op iemand zoals jij. Stel je kandidaat voor een request die je leuk vindt: de prijs staat er al bij en je wordt meteen na levering betaald.", bl: "samen te verdienen op deze vier requests", cta: "Bekijk de requests", a: "Tip: snel reageren en een korte, warme notitie maken het verschil." },
      en: { s: "Requests are waiting for you", p: "Pick one and earn your first money", k: "Your first deal", t: "Your first money is waiting.", i: "You are verified. Buyers are waiting for someone like you. Apply for a request you like: the price is already on it and you get paid right after delivery.", bl: "to earn on these four requests together", cta: "See the requests", a: "Tip: a quick reply and a short, warm note make the difference." },
      fr: { s: "Des demandes t’attendent", p: "Choisis-en une et gagne ton premier argent", k: "Ton premier deal", t: "Ton premier argent t’attend.", i: "Tu es vérifié. Des acheteurs attendent quelqu’un comme toi. Postule à une demande qui te plaît : le prix est déjà indiqué et tu es payé juste après la livraison.", bl: "à gagner sur ces quatre demandes", cta: "Voir les demandes", a: "Astuce : une réponse rapide et une note courte et chaleureuse font la différence." },
    }[l];
    return { subject: T.s, mail: { ...base("violet"), preheader: T.p, kicker: T.k, title: T.t, intro: T.i, big: sum ? { value: eur(sum, l), label: T.bl } : undefined, rows, cta: { label: T.cta, href: `${SITE}/for-you` }, after: T.a } };
  }
  if (kind === "buyer_first_request") {
    const n = await verifiedCreators();
    const T = {
      nl: { s: "Je eerste request in twee minuten", p: "Geverifieerde creators wachten op je vraag", k: "Vraag het gewoon", t: "Zeg wat je wil. Iemand maakt het.", i: "Beschrijf in een paar woorden wat je wil zien of horen, kies je budget en geverifieerde creators stellen zich kandidaat. Jij kiest. Pas als het klopt, wordt er uitbetaald.", bl: "geverifieerde creators", r: [["Voice note met je naam", "vanaf €20"], ["Fotoset op maat", "vanaf €30"], ["Video op maat", "vanaf €60"]], cta: "Plaats je eerste request", a: "Discreet: op je afschrift staat BRQ DIGITAL. Niemand ziet wie je bent." },
      en: { s: "Your first request in two minutes", p: "Verified creators are waiting for your ask", k: "Just ask", t: "Say what you want. Someone makes it.", i: "Describe in a few words what you want to see or hear, pick your budget and verified creators apply. You choose. Nobody is paid until it matches.", bl: "verified creators", r: [["Voice note with your name", "from €20"], ["Custom photo set", "from €30"], ["Custom video", "from €60"]], cta: "Post your first request", a: "Discreet: your statement shows BRQ DIGITAL. Nobody sees who you are." },
      fr: { s: "Ta première demande en deux minutes", p: "Des créateurs vérifiés attendent ta demande", k: "Demande simplement", t: "Dis ce que tu veux. Quelqu’un le crée.", i: "Décris en quelques mots ce que tu veux voir ou entendre, choisis ton budget et des créateurs vérifiés postulent. Tu choisis. Personne n’est payé tant que ce n’est pas conforme.", bl: "créateurs vérifiés", r: [["Vocal avec ton prénom", "dès 20 €"], ["Série photo sur mesure", "dès 30 €"], ["Vidéo sur mesure", "dès 60 €"]], cta: "Publier ma première demande", a: "Discret : ton relevé affiche BRQ DIGITAL. Personne ne sait qui tu es." },
    }[l];
    return { subject: T.s, mail: { ...base("mint"), preheader: T.p, kicker: T.k, title: T.t, intro: T.i, big: n ? { value: String(n), label: T.bl } : undefined, rows: T.r as [string, string][], cta: { label: T.cta, href: `${SITE}/post` }, after: T.a } };
  }
  // winback_14d
  const top = await topBudgets(3, c.userId);
  const T = {
    nl: { s: "Er is veel veranderd", p: "Nieuwe requests en creators sinds je laatste bezoek", k: "Lang niet gezien", t: "Er staat weer van alles klaar.", i: "Sinds je laatste bezoek kwamen er nieuwe requests en nieuwe creators bij. Kijk even rond, het duurt maar een minuut.", bl: "hoogste budget op het board nu", cta: "Kijk wat er nieuw is", a: "Je account en je vault staan klaar zoals je ze achterliet." },
    en: { s: "A lot has changed", p: "New requests and creators since your last visit", k: "Long time no see", t: "There is plenty waiting again.", i: "Since your last visit new requests and new creators joined. Have a look, it only takes a minute.", bl: "top budget on the board right now", cta: "See what is new", a: "Your account and your vault are just as you left them." },
    fr: { s: "Beaucoup de choses ont changé", p: "Nouvelles demandes et nouveaux créateurs depuis ta dernière visite", k: "Ça fait longtemps", t: "Plein de choses t’attendent.", i: "Depuis ta dernière visite, de nouvelles demandes et de nouveaux créateurs sont arrivés. Jette un œil, ça ne prend qu’une minute.", bl: "plus gros budget du tableau en ce moment", cta: "Voir les nouveautés", a: "Ton compte et ton coffre sont comme tu les as laissés." },
  }[l];
  return { subject: T.s, mail: { ...base("ink"), preheader: T.p, kicker: T.k, title: T.t, intro: T.i, big: top[0] ? { value: eur(top[0].dealCents, l), label: T.bl } : undefined, cta: { label: T.cta, href: SITE }, after: T.a } };
}

/* Who is due for which email right now. */
async function candidates(kind: Kind, now: Date) {
  const base = and(isNull(users.deletedAt), isNull(users.bannedAt), eq(users.house, false), sql`${users.email} not like '%@demo.byrequest.app'`, sql`coalesce((${users.prefs}->>'mailOff')::boolean, false) = false`,
    sql`not exists (select 1 from email_log e where e.user_id = ${users.id} and e.kind = ${kind})`,
    sql`not exists (select 1 from email_log e where e.user_id = ${users.id} and e.sent_at > ${new Date(now.getTime() - D)})`);
  const q = db.select({ id: users.id, email: users.email, handle: users.handle, lang: users.lang, isCreator: users.isCreator }).from(users);
  if (kind === "invite_24h") return q.where(and(base, lt(users.createdAt, new Date(now.getTime() - 22 * H)), gt(users.createdAt, new Date(now.getTime() - 4 * D)))).limit(50);
  if (kind === "creator_setup" || kind === "creator_first_apply") {
    const rows = await q.where(and(base, eq(users.isCreator, true), lt(users.createdAt, new Date(now.getTime() - (kind === "creator_setup" ? D : 2 * D))), gt(users.createdAt, new Date(now.getTime() - (kind === "creator_setup" ? 7 : 21) * D)))).limit(100);
    const out = [];
    for (const r of rows) {
      const active = (await access(r.id)).status === "active";
      if (kind === "creator_setup" && !active) out.push(r);
      if (kind === "creator_first_apply" && active && !(await db.query.offers.findFirst({ where: eq(offers.creatorId, r.id), columns: { id: true } }))) out.push(r);
    }
    return out.slice(0, 50);
  }
  if (kind === "buyer_first_request") return q.where(and(base, eq(users.isCreator, false), lt(users.createdAt, new Date(now.getTime() - 2 * D)), gt(users.createdAt, new Date(now.getTime() - 14 * D)), sql`not exists (select 1 from requests r where r.buyer_id = ${users.id})`)).limit(50);
  return q.where(and(base, lt(users.createdAt, new Date(now.getTime() - 14 * D)), sql`coalesce(${users.lastSeenAt}, ${users.createdAt}) < ${new Date(now.getTime() - 14 * D)}`)).limit(50);
}

/* Worker step: send what is due, in quiet daytime hours only. */
export async function runLifecycle(now = new Date(), opts: { force?: boolean } = {}) {
  if (!opts.force && !awake(now)) return { sent: 0, asleep: true };
  let sent = 0;
  for (const kind of KINDS) {
    for (const u of await candidates(kind, now)) {
      const claimed = await db.insert(emailLog).values({ userId: u.id, kind, sentAt: now }).onConflictDoNothing().returning();
      if (!claimed.length) continue;                       // another worker took it
      try {
        const b = await build(kind, { lang: (["nl", "en", "fr"].includes(u.lang) ? u.lang : "nl") as Lang, userId: u.id, handle: u.handle });
        await deliver(u.email, b.subject, b.mail);
        await log(db, "system", "mail.lifecycle", u.id, { kind });
        sent++;
      } catch (e) {
        await db.update(emailLog).set({ status: "failed" }).where(and(eq(emailLog.userId, u.id), eq(emailLog.kind, kind)));
        console.error("lifecycle mail", kind, e instanceof Error ? e.message : e);
      }
    }
  }
  return { sent, asleep: false };
}

/* For the back office preview and the test button. */
export async function preview(kind: Kind, lang: Lang, userId: string, handle: string) { return build(kind, { lang, userId, handle }); }
export async function sendTest(kind: Kind, lang: Lang, user: { id: string; email: string; handle: string }) {
  const b = await build(kind, { lang, userId: user.id, handle: user.handle });
  return deliver(user.email, `[Test] ${b.subject}`, b.mail);
}
export async function mailStats() {
  return db.select({ kind: emailLog.kind, status: emailLog.status, n: sql<number>`count(*)::int`, last: sql<Date>`max(${emailLog.sentAt})` }).from(emailLog).groupBy(emailLog.kind, emailLog.status).orderBy(desc(sql`max(${emailLog.sentAt})`));
}
