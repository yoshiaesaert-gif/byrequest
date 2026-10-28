/* What is hot on ByRequest: themes rather than file types. One list feeds both home pages and the
   board filter. `match` finds a theme in a title or description in any of the three languages. */
import type { Category } from "@/domain/rules";

export type Theme = { k: string; title: string; sub: string; cat: Category; amount: number; budget: number; example: string; match: RegExp };
export const THEMES: Theme[] = [
  { k: "alpha", title: "Alpha Gods", sub: "A straight alpha takes control, and you pay for the privilege", cat: "custom", amount: 6, budget: 120, example: "Alpha God: show me where I belong", match: /\balpha\b|dominan|domineer|soumis|submiss/i },
  { k: "jerk", title: "Jerk off videos", sub: "Solo, all the way, on camera", cat: "video", amount: 5, budget: 90, example: "Jerk off video, all the way", match: /jerk|aftrek|branl|\bjo\b|solo session|finish on camera/i },
  { k: "shower", title: "Shower videos", sub: "Steam, wet skin, no rush", cat: "video", amount: 5, budget: 80, example: "Shower video, slow and steamy", match: /shower|douche/i },
  { k: "strip", title: "Strip tease", sub: "One piece at a time, make them wait", cat: "video", amount: 5, budget: 85, example: "Slow strip tease, just for me", match: /strip/i },
  { k: "underwear", title: "Underwear and lingerie", sub: "Try ons, mirror sets, the bolder the better", cat: "photos", amount: 6, budget: 60, example: "Underwear try on, 6 pics", match: /linger|underwear|ondergoed|boxer|briefs|jockstrap|sous v[êe]t|slip|stockings|kousen/i },
  { k: "gym", title: "Gym and locker room", sub: "Pumped, sweaty, shirt off", cat: "photos", amount: 8, budget: 70, example: "Locker room after the pump", match: /\bgym\b|locker|kleedkamer|vestiaire|fitness|pump|workout|training|entra[iî]nement/i },
  { k: "dirty", title: "Dirty talk and moans", sub: "Close to the mic, say my name", cat: "voice", amount: 3, budget: 45, example: "Moan my name, 3 minutes", match: /dirty talk|moan|kreun|g[ée]mi|whisper|fluister|chuchot/i },
  { k: "feet", title: "Feet and socks", sub: "Soles, socks, sneakers off", cat: "photos", amount: 6, budget: 50, example: "Socks off after training", match: /\bfeet\b|\bfoot\b|voeten|sokken|socks|pieds|chaussettes|sneakers/i },
];
export const themeOf = (k?: string) => THEMES.find((x) => x.k === k);
