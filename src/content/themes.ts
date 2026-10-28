/* What is hot on ByRequest. Every theme is a concrete thing one creator can make alone with a phone,
   so a request started from it is clear from the first line. One list feeds both home pages and the
   board filter; `match` finds the theme in a title or description in any of the three languages. */
import type { Category } from "@/domain/rules";

export type Theme = { k: string; title: string; line: string; cover: string; sub: string; cat: Category; amount: number; budget: number; example: string; details: string; match: RegExp };
export const THEMES: Theme[] = [
  { k: "alpha", title: "Alpha Gods", line: "He talks down. You pay.", cover: "c09", sub: "A straight guy flexes, gives orders and puts you in your place, on camera", cat: "video", amount: 6, budget: 120,
    example: "Alpha God: talk down to me", details: "Straight, confident, shirt off. Look into the camera, flex, give me orders and tell me what I'm worth. Make me feel lucky that I'm allowed to watch. Face optional.", match: /\balpha\b|dominan|domineer|soumis|submiss|talk down/i },
  { k: "socks", title: "White socks", line: "Socks on. All the way.", cover: "c20", sub: "Jerking off with white sports socks on, finish on camera", cat: "video", amount: 5, budget: 90,
    example: "Jerk off in white socks", details: "White sports socks stay on the whole time. Take it slow, build it up and finish on camera. Feet in the shot now and then. No face needed.", match: /jerk|aftrek|branl|white socks|witte sokken|chaussettes blanches/i },
  { k: "shower", title: "Hot shower", line: "Wet, slow, finish under the water.", cover: "c05", sub: "A steamy shower that ends with a finish under the water", cat: "video", amount: 6, budget: 100,
    example: "Hot shower, finish under the water", details: "Steam, warm light, take your time. Soap up slowly, let your hands wander and finish under the water. No talking needed.", match: /shower|douche/i },
  { k: "story", title: "Dirty stories", line: "A filthy story, close to the mic.", cover: "c17", sub: "A horny story told slowly in a voice note", cat: "voice", amount: 5, budget: 60,
    example: "Tell me a dirty story", details: "A slow, horny story in your own words, close to the mic. Tell me what you would do to me, step by step. Breathing and pauses welcome.", match: /dirty|story|verhaal|histoire|naughty|ondeugend/i },
  { k: "moan", title: "Moan my name", line: "Say my name. Don't stop.", cover: "c16", sub: "A moaning voice note with your name in it, until the finish", cat: "voice", amount: 3, budget: 45,
    example: "Moan my name until you finish", details: "Close to the mic, breathe, moan and say my name now and then. Keep going until you finish. The more real the better.", match: /moan|kreun|g[ée]mi/i },
  { k: "strip", title: "Strip tease", line: "One piece at a time.", cover: "c25", sub: "Slowly undressing, down to the very last piece", cat: "video", amount: 5, budget: 85,
    example: "Slow strip tease, all the way", details: "Music you like, one piece at a time, down to the very last one. Make me wait. Turn around, look back into the camera.", match: /strip/i },
  { k: "underwear", title: "Underwear try on", line: "Five pairs. Turn around.", cover: "c21", sub: "Five pairs one after the other, in front of the mirror", cat: "video", amount: 6, budget: 75,
    example: "Underwear try on, 5 pairs", details: "Five pairs of underwear one after the other, in front of the mirror. Put each one on slowly, turn around, show me from every side. The tighter the better.", match: /linger|underwear|ondergoed|boxer|briefs|jockstrap|sous v[êe]t|slip|try on/i },
  { k: "gym", title: "After the gym", line: "Still sweaty. Shirt off.", cover: "c07", sub: "Straight from training: sweaty, flexing and playing", cat: "video", amount: 5, budget: 80,
    example: "Sweaty after the gym, shirt off", details: "Film it right after training, still sweaty. Shirt off, flex for me, shorts down bit by bit and play. Locker room or at home.", match: /\bgym\b|locker|kleedkamer|vestiaire|fitness|pump|workout|training|entra[iî]nement|sweaty|bezweet/i },
  { k: "feet", title: "Feet", line: "Socks first. Then bare.", cover: "c12", sub: "White socks first, then bare, soles to the camera", cat: "photos", amount: 8, budget: 50,
    example: "Feet: socks first, then bare", details: "8 photos. Start in white socks, then take them off slowly. Soles to the camera, close up, on the bed or the couch.", match: /\bfeet\b|\bfoot\b|voeten|sokken|socks|pieds|chaussettes|soles|zolen/i },
  { k: "oil", title: "Oiled up", line: "Slow hands, shiny skin.", cover: "c13", sub: "Oiling up slowly, everywhere, finish on camera", cat: "video", amount: 6, budget: 95,
    example: "Oil yourself up, everywhere", details: "Dim light, warm oil. Rub it in slowly, everywhere, let the skin shine. Take your time and finish on camera.", match: /\boil|olie|huile|massage/i },
];
export const themeOf = (k?: string) => THEMES.find((x) => x.k === k);

/* A fresh order on every visit, so the row of moods never looks the same twice. */
export function shuffled<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
