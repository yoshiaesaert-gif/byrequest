/* What is hot on ByRequest: themes rather than file types. One list feeds both home pages and the
   board filter. `match` finds a theme in a title or description in any of the three languages. */
import type { Category } from "@/domain/rules";

export type Theme = { k: string; title: string; line: string; cover: string; sub: string; cat: Category; amount: number; budget: number; example: string; match: RegExp };
export const THEMES: Theme[] = [
  { k: "alpha", title: "Alpha Gods", line: "Straight, dominant, in charge.", cover: "c09", sub: "A straight alpha takes control, and you pay for the privilege", cat: "custom", amount: 6, budget: 120, example: "Alpha God: show me where I belong", match: /\balpha\b|dominan|domineer|soumis|submiss/i },
  { k: "jerk", title: "Jerk off videos", line: "All the way, on camera.", cover: "c20", sub: "Solo, all the way, on camera", cat: "video", amount: 5, budget: 90, example: "Jerk off video, all the way", match: /jerk|aftrek|branl|\bjo\b|solo session|finish on camera/i },
  { k: "shower", title: "Shower videos", line: "Wet, slow, steamy.", cover: "c05", sub: "Steam, wet skin, no rush", cat: "video", amount: 5, budget: 80, example: "Shower video, slow and steamy", match: /shower|douche/i },
  { k: "strip", title: "Strip tease", line: "One piece at a time.", cover: "c25", sub: "One piece at a time, make them wait", cat: "video", amount: 5, budget: 85, example: "Slow strip tease, just for me", match: /strip/i },
  { k: "underwear", title: "Underwear and lingerie", line: "Try it on for me.", cover: "c21", sub: "Try ons, mirror sets, the bolder the better", cat: "photos", amount: 6, budget: 60, example: "Underwear try on, 6 pics", match: /linger|underwear|ondergoed|boxer|briefs|jockstrap|sous v[êe]t|slip|stockings|kousen/i },
  { k: "gym", title: "Gym and locker room", line: "Pumped and shirtless.", cover: "c07", sub: "Pumped, sweaty, shirt off", cat: "photos", amount: 8, budget: 70, example: "Locker room after the pump", match: /\bgym\b|locker|kleedkamer|vestiaire|fitness|pump|workout|training|entra[iî]nement/i },
  { k: "dirty", title: "Dirty talk and moans", line: "Moan my name.", cover: "c17", sub: "Close to the mic, say my name", cat: "voice", amount: 3, budget: 45, example: "Moan my name, 3 minutes", match: /dirty talk|moan|kreun|g[ée]mi|whisper|fluister|chuchot/i },
  { k: "feet", title: "Feet and socks", line: "Socks off, soles up.", cover: "c12", sub: "Soles, socks, sneakers off", cat: "photos", amount: 6, budget: 50, example: "Socks off after training", match: /\bfeet\b|\bfoot\b|voeten|sokken|socks|pieds|chaussettes|sneakers/i },
  { k: "oil", title: "Oiled up", line: "Slow hands, shiny skin.", cover: "c13", sub: "Oil, dim light, take your time", cat: "video", amount: 6, budget: 90, example: "Oiling up, really slowly", match: /\boil|olie|huile|massage/i },
  { k: "bed", title: "In bed, nothing underneath", line: "Just a sheet.", cover: "c24", sub: "Lazy, warm, barely covered", cat: "photos", amount: 8, budget: 70, example: "In bed, nothing underneath, 8 pics", match: /\bbed\b|in bed|lakens|sheets|\blit\b|niets eronder|nothing underneath|rien dessous/i },
];
export const themeOf = (k?: string) => THEMES.find((x) => x.k === k);

/* A fresh order on every visit, so the row of moods never looks the same twice. */
export function shuffled<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
