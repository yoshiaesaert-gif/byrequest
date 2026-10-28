/* Automatic first look at a new request, in Dutch, English and French. It never decides: it
   gives staff a suggestion (approve, check or reject) and the reasons, and staff take the decision.
   Patterns are deliberately broad; a false alarm costs a few seconds of a reviewer, a miss costs more. */

export type Flag = { code: string; level: "block" | "warn" | "info"; label: string; match?: string };
export type Verdict = "approve" | "check" | "reject";
export type Screened = { verdict: Verdict; flags: Flag[] };

type Input = { title: string; details?: string | null; category: string; amount: number; dealCents: number; ageMin: number; ageMax: number; who?: string };
type Ctx = { recentTitles?: string[]; buyerAgeVerified?: boolean; buyerDeals?: number; buyerRejected?: number };

const RULES: { code: string; level: Flag["level"]; label: string; re: RegExp }[] = [
  // Hard lines: anything that may involve a minor, missing consent or illegal acts.
  { code: "minor", level: "block", label: "May involve a minor", re: /\b(minor|minderjarig\w*|mineur\w*|underage|under ?18|onder de 18|moins de 18|kindje|kinderen|child(ren)?|kids?|enfant|teen(ager)?s?|tiener\w*|ado(lescent)?e?s?|schoolgirl|schoolboy|schoolmeisje|écolière|lolita|jailbait|barely legal|net 18|petite fille|klein meisje|little girl|young girl|jong meisje|1[0-7] ?(jaar|years?|yo|ans))\b/i },
  { code: "consent", level: "block", label: "Consent missing or hidden filming", re: /\b(zonder (dat )?(ze|hij|die) het weet|without (her|him|them) knowing|sans qu'(elle|il) (le )?sache|hidden cam\w*|verborgen camera|caméra cachée|spy ?cam|stiekem gefilmd|secretly film\w*|upskirt|non[- ]?consensual|niet consensueel|non consenti\w*|rape|verkracht\w*|viol|drugged|gedrogeerd|drogué\w*|onder invloed|bewusteloos|unconscious|inconscient\w*|slapend gefilmd|while (she|he) sleeps|my ex|van mijn ex|de mon ex|revenge)\b/i },
  { code: "illegal", level: "block", label: "Prohibited act", re: /\b(incest\w*|inceste|bestiality|bestialiteit|zoophil\w*|dier(en)?seks|animal sex|beestachtig|blood ?play|choke|wurgen|étrangl\w*|violence|geweld|scat|kaviaar)\b/i },
  // Off platform: contact details, other payment rails, meeting in person.
  { code: "contact", level: "warn", label: "Contact details or off platform contact", re: /([\w.+-]+@[\w-]+\.[\w.]+|(\+|00)\d[\d ()-]{7,}|\b0\d{2,3}[ /-]?\d{2,3}[ -]?\d{2,4}\b|https?:\/\/|www\.|\b(whats ?app|telegram|snap ?chat|snap|insta(gram)?|onlyfans|kik|discord|tiktok)\b|(^|\s)@\w{3,})/i },
  { code: "payment", level: "warn", label: "Payment outside ByRequest", re: /\b(paypal|tikkie|iban|be\d{2} ?\d{4}|nl\d{2} ?[a-z]{4}|cash|contant|liquide|crypto|bitcoin|btc|usdt|revolut|payconiq|western union|bankoverschrijving|virement)\b/i },
  { code: "meet", level: "warn", label: "Asks to meet in person", re: /\b(afspreken|ontmoeten|meet ?up|meet in person|irl|in het echt|in real life|en vrai|se voir|rencontr\w*|langskomen|chez moi|bij mij thuis|my place|hotel room for us|escort|massage met happy end)\b/i },
  // Things that are allowed but need a human eye.
  { code: "real_person", level: "warn", label: "Mentions a real or famous person", re: /\b(look ?alike|lijkt op|ressemble à|celebrity|beroemd\w*|célèbre|bekende vlaming|bekende nederlander)\b/i },
  { code: "third_party", level: "info", label: "Other people in frame", re: /\b(koppel|couple|samen met (een )?(vriend|vriendin)|with (a )?friend|avec (un|une) ami|threesome|trio|groep|group)\b/i },
];

const VOWELS = /[aeiouyàâäéèêëïîôöùûü]/i;

export function screen(r: Input, ctx: Ctx = {}): Screened {
  const flags: Flag[] = [];
  const text = `${r.title}\n${r.details ?? ""}`;
  for (const rule of RULES) {
    const m = text.match(rule.re);
    if (m) flags.push({ code: rule.code, level: rule.level, label: rule.label, match: m[0].trim().slice(0, 40) });
  }
  // Quality: keyboard mash, too short, shouting.
  const letters = r.title.replace(/[^\p{L}]/gu, "");
  const words = r.title.split(/\s+/).filter(Boolean);
  if (letters.length >= 6 && !VOWELS.test(letters)) flags.push({ code: "gibberish", level: "block", label: "Title looks like keyboard mash", match: r.title.slice(0, 40) });
  else if (words.some((w) => w.length >= 8 && !VOWELS.test(w)) || /(.)\1{4,}/.test(r.title)) flags.push({ code: "gibberish", level: "warn", label: "Part of the title looks like nonsense", match: r.title.slice(0, 40) });
  if (r.title.trim().length < 6) flags.push({ code: "short", level: "warn", label: "Title is very short" });
  if (letters.length >= 10 && letters === letters.toUpperCase()) flags.push({ code: "caps", level: "info", label: "Title in capitals" });
  // Budget: odd prices get a look, not a refusal.
  const per = r.dealCents / 100 / Math.max(1, r.amount);
  if (r.dealCents >= 100_000) flags.push({ code: "budget_high", level: "warn", label: "Very high budget, check for mistakes or pressure" });
  else if (per < 2) flags.push({ code: "budget_low", level: "info", label: "Low budget for what is asked" });
  if (r.ageMin < 21 && /\b(young|jong|jeune|petite|klein|tiny)\b/i.test(text)) flags.push({ code: "young", level: "warn", label: "Youth wording with a low age range" });
  // Account context.
  if (ctx.buyerAgeVerified === false) flags.push({ code: "age_unverified", level: "info", label: "Buyer has not confirmed their age yet" });
  if ((ctx.buyerRejected ?? 0) >= 2) flags.push({ code: "repeat_rejected", level: "warn", label: `Buyer had ${ctx.buyerRejected} requests rejected before` });
  if (ctx.recentTitles?.some((t) => t.trim().toLowerCase() === r.title.trim().toLowerCase())) flags.push({ code: "duplicate", level: "warn", label: "Same title posted recently by this buyer" });
  if ((ctx.buyerDeals ?? 0) >= 3) flags.push({ code: "trusted", level: "info", label: `Buyer completed ${ctx.buyerDeals} deals` });

  const verdict: Verdict = flags.some((f) => f.level === "block") ? "reject" : flags.some((f) => f.level === "warn") ? "check" : "approve";
  return { verdict, flags };
}
