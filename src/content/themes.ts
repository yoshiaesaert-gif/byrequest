/* What is hot on ByRequest. Every theme is a concrete thing one creator can make alone with a phone,
   so a request started from it is clear from the first line. One list feeds both home pages and the
   board filter; `match` finds the theme in a title or description in any of the three languages. */
import type { Category } from "@/domain/rules";

export type Theme = { k: string; title: string; line: string; cover: string; sub: string; cat: Category; amount: number; budget: number; example: string; details: string; match: RegExp; alt?: string[] };
export const THEMES: Theme[] = [
  { k: "alpha", title: "Alpha Gods", line: "He talks down. You pay.", cover: "mood_alpha", alt: ["mood_alpha2"], sub: "A straight guy flexes, gives orders and puts you in your place, on camera", cat: "video", amount: 6, budget: 120,
    example: "Alpha God: talk down to me", details: "Straight, confident, shirt off. Look into the camera, flex, give me orders and tell me what I'm worth. Make me feel lucky that I'm allowed to watch. Face optional.", match: /\balpha\b|dominan|domineer|soumis|submiss|talk down/i },
  { k: "socks", title: "White socks", line: "Socks on. All the way.", cover: "mood_socks", sub: "Jerking off with white sports socks on, finish on camera", cat: "video", amount: 5, budget: 90,
    example: "Jerk off in white socks", details: "White sports socks stay on the whole time. Take it slow, build it up and finish on camera. Feet in the shot now and then. No face needed.", match: /jerk|aftrek|branl|white socks|witte sokken|chaussettes blanches/i },
  { k: "shower", title: "Hot shower", line: "Wet, slow, all the way.", cover: "mood_shower", sub: "A steamy shower that ends with a finish under the water", cat: "video", amount: 6, budget: 100,
    example: "Hot shower, finish under the water", details: "Steam, warm light, take your time. Soap up slowly, let your hands wander and finish under the water. No talking needed.", match: /shower|douche/i },
  { k: "locker", title: "Locker room shower", line: "Three guys. One shower.", cover: "mood_locker", sub: "Showering together after the match, soaping up and getting hands on", cat: "video", amount: 8, budget: 220,
    example: "Locker room shower with the team", details: "Two or three guys in the shower after training. Soap each other up, joke around and let it get heated. Everyone verified, faces optional.", match: /locker|kleedkamer|vestiaire|group shower|groepsdouche|douche collective/i },
  { k: "sniff", title: "Smell my socks", line: "Worn all day. Breathe in.", cover: "mood_sniff", sub: "Socks worn all day, sniffed slowly and close to the camera", cat: "video", amount: 4, budget: 70,
    example: "Smell your worn socks for me", details: "Socks you wore all day or at the gym. Take them off slowly, bring them to your face and breathe them in, close to the camera. Talk dirty about how they smell. Face optional.", match: /sniff|ruik|ruiken|renifl|sentir|worn socks|gedragen sokken|chaussettes port/i },
  { k: "story", title: "Dirty stories", line: "A filthy story, close to the mic.", cover: "mood_story", sub: "A horny story told slowly in a voice note", cat: "voice", amount: 5, budget: 60,
    example: "Tell me a dirty story", details: "A slow, horny story in your own words, close to the mic. Tell me what you would do to me, step by step. Breathing and pauses welcome.", match: /dirty|story|verhaal|histoire|naughty|ondeugend/i },
  { k: "moan", title: "Moan my name", line: "Say my name. Don't stop.", cover: "mood_moan", sub: "A moaning voice note with your name in it, until the finish", cat: "voice", amount: 3, budget: 45,
    example: "Moan my name until you finish", details: "Close to the mic, breathe, moan and say my name now and then. Keep going until you finish. The more real the better.", match: /moan|kreun|g[ée]mi/i },
  { k: "strip", title: "Strip tease", line: "One piece at a time.", cover: "mood_strip", sub: "Slowly undressing, down to the very last piece", cat: "video", amount: 5, budget: 85,
    example: "Slow strip tease, all the way", details: "Music you like, one piece at a time, down to the very last one. Make me wait. Turn around, look back into the camera.", match: /strip/i },
  { k: "underwear", title: "Underwear try on", line: "Five pairs. Turn around.", cover: "mood_underwear", sub: "Five pairs one after the other, in front of the mirror", cat: "video", amount: 6, budget: 75,
    example: "Underwear try on, 5 pairs", details: "Five pairs of underwear one after the other, in front of the mirror. Put each one on slowly, turn around, show me from every side. The tighter the better.", match: /linger|underwear|ondergoed|boxer|briefs|jockstrap|sous v[êe]t|slip|try on/i },
  { k: "gym", title: "After the gym", line: "Still sweaty. Shirt off.", cover: "mood_gym", sub: "Straight from training: sweaty, flexing and playing", cat: "video", amount: 5, budget: 80,
    example: "Sweaty after the gym, shirt off", details: "Film it right after training, still sweaty. Shirt off, flex for me, shorts down bit by bit and play. Locker room or at home.", match: /\bgym\b|locker|kleedkamer|vestiaire|fitness|pump|workout|training|entra[iî]nement|sweaty|bezweet/i },
  { k: "feet", title: "Feet", line: "Socks first. Then bare.", cover: "mood_feet", sub: "White socks first, then bare, soles to the camera", cat: "photos", amount: 8, budget: 50,
    example: "Feet: socks first, then bare", details: "8 photos. Start in white socks, then take them off slowly. Soles to the camera, close up, on the bed or the couch.", match: /\bfeet\b|\bfoot\b|voeten|sokken|socks|pieds|chaussettes|soles|zolen/i },
  { k: "oil", title: "Oiled up", line: "Slow hands, shiny skin.", cover: "mood_oil", sub: "Oiling up slowly, everywhere, finish on camera", cat: "video", amount: 6, budget: 95,
    example: "Oil yourself up, everywhere", details: "Dim light, warm oil. Rub it in slowly, everywhere, let the skin shine. Take your time and finish on camera.", match: /\boil|olie|huile|massage/i },
  { k: "domina", title: "Domina", line: "Heels on. You kneel.", cover: "mood_domina", sub: "She is in charge: boots, leather and a man on his knees", cat: "video", amount: 6, budget: 160,
    example: "Domina puts me in my place", details: "Leather, boots, a strict voice. Look down into the camera, give orders, make me kneel and beg. Slow, confident, all the way. Face optional.", match: /domina|mistress|meesteres|maîtresse|femdom/i },
  { k: "couple", title: "Couple in the shower", line: "Two of you. One stream of water.", cover: "mood_couple", alt: ["mood_couple2", "mood_couple3"], sub: "A real couple, kissing and touching under a hot shower", cat: "video", amount: 8, budget: 220,
    example: "Real couple in a steamy shower", details: "Both of you under hot water. Kiss slowly, soap each other up, hands everywhere and let it go further. Both verified, faces optional.", match: /couple|koppel|stel\b|en couple/i },
  { k: "hershower", title: "Her shower", line: "Wet hair. Slow hands.", cover: "mood_hershower", sub: "A woman showering slowly, water running down her back", cat: "video", amount: 6, budget: 100,
    example: "Her slow, steamy shower", details: "Warm light and steam. Let the water run down your back, soap up slowly and take your time everywhere. Face optional.", match: /her shower|haar douche|sa douche/i },
  { k: "heroil", title: "Oil her up", line: "Glossy skin. Candlelight.", cover: "mood_heroil", alt: ["mood_heroil2"], sub: "A woman on a dark bed, oiling up slowly until everything shines", cat: "video", amount: 6, budget: 110,
    example: "Oil yourself up for me, slowly", details: "On the bed, candles, warm oil. Rub it in slowly over your back, hips and legs until everything shines. Tease the camera. Face optional.", match: /oil her|olie haar|huile|oiled woman/i },
  { k: "lingerie", title: "Lingerie try on", line: "Lace, one set at a time.", cover: "mood_lingerie", sub: "Trying on lace sets in front of the mirror, turning slowly", cat: "video", amount: 6, budget: 90,
    example: "Lingerie try on in front of the mirror", details: "Three lace sets, one after the other. Turn slowly in front of the mirror, look back over your shoulder and show every angle. Face optional.", match: /lingerie|kant\b|dentelle/i },
  { k: "herfeet", title: "Her feet", line: "Soles up. Toes painted.", cover: "mood_herfeet", sub: "Her bare feet and soles, close to the camera", cat: "photos", amount: 8, budget: 60,
    example: "Your feet and soles, up close", details: "8 photos. Bare feet, painted toes, soles toward the camera. Lying on the sofa or bed, playful look. Face optional.", match: /her feet|haar voeten|ses pieds|soles|zolen/i },
  { k: "uniform", title: "Construction worker", line: "Vest open. Belt undone.", cover: "mood_uniform", sub: "A worker straight off the site, vest on, shirt off, belt undone", cat: "video", amount: 6, budget: 110,
    example: "Construction worker after his shift", details: "Safety vest, work pants, dusty boots. Shirt off, belt undone, slow and rough. Talk to the camera like I just walked onto the site. Face optional.", match: /uniform|worker|bouwvakker|ouvrier|chantier/i },
  { k: "pits", title: "Sweaty pits", line: "Arms up. Breathe in.", cover: "mood_pits", sub: "Arms up after a long day, sweaty pits close to the camera", cat: "video", amount: 4, budget: 60,
    example: "Show me your sweaty pits", details: "After training or a long day. Arms up, pits close to the camera, smell them and tell me how they smell. Slow and close. Face optional.", match: /pits|oksel|aisselle|armpit/i },
];
export const themeOf = (k?: string) => THEMES.find((x) => x.k === k);

/* The moods for one visit: a fresh order, and themes with several photos show a different one each time. */
export const moodsNow = () => shuffled(THEMES).map((x) => ({ ...x, cover: x.alt?.length ? [x.cover, ...x.alt][Math.floor(Math.random() * (x.alt.length + 1))] : x.cover }));

/* A fresh order on every visit, so the row of moods never looks the same twice. */
export function shuffled<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
