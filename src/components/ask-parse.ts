import { THEMES } from "@/content/themes";

/* Turns a plain sentence into a prefilled request, in English, Dutch or French, for example
   "a 10 minute shower video for €80" or "aftrekken met witte sokken, 5 min". A recognised theme
   brings its own description and a fitting budget; numbers and amounts in the sentence win. */
const MAX: Record<string, number> = { video: 10, voice: 10, photos: 30, custom: 30 };
export function parseAsk(q: string, tr: (s: string) => string = (s) => s) {
  const t = q.toLowerCase();
  const theme = THEMES.find((x) => x.match.test(t));
  const category = /voice|audio|spraak|stem|vocal|voix|good ?night|good ?morning|welterusten|goedemorgen|moan|kreun|g[ée]mi/.test(t) ? "voice"
    : /photo|foto|pic|selfie|set\b/.test(t) ? "photos"
    : /video|vid[ée]o|film|clip/.test(t) ? "video"
    : theme?.cat ?? (/idea|idee|id[ée]e|custom|surprise|verras|birthday|verjaardag|anniversaire/.test(t) ? "custom" : "video");
  const num = /(\d{1,3})\s*(min|minute|minuten|photo|foto|pic|stuks|x)/.exec(t)?.[1];
  const euro = /€\s*(\d{2,4})|(\d{2,4})\s*(eur|euro)/.exec(t);
  const p = new URLSearchParams({ c: category });
  const amount = num ? Math.min(Number(num), MAX[category]) : theme && theme.cat === category ? theme.amount : undefined;
  if (amount) p.set("amount", String(amount));
  const budget = euro ? (euro[1] ?? euro[2]) : theme ? String(theme.budget) : undefined;
  if (budget) p.set("budget", budget);
  // The sentence becomes the title, without the price and length the form already holds.
  const clean = q.replace(/€\s*\d+|\d+\s*(eur|euro)\b/gi, "").replace(/[\s,.;]+$/g, "").replace(/\s+(for|voor|pour)$/i, "").replace(/\s+/g, " ").trim();
  const title = (clean.length >= 10 ? clean : q.trim()).slice(0, 70);
  if (title) p.set("title", title.charAt(0).toUpperCase() + title.slice(1));
  if (theme) p.set("d", tr(theme.details));
  else if (q.trim().length >= 40) p.set("d", q.trim().slice(0, 800));
  return `/post?${p}`;
}
