"use client";
import { useT } from "@/i18n/client";

/* The four questions a creator asks before the first deal, answered with what ByRequest really does. */
const ITEMS: [icon: string, q: string, a: string][] = [
  ["eyeoff", "Will anyone know it is me?", "No name, no face needed. Buyers only see your username and avatar. Keep logos, team kit and rooms people recognise out of the shot."],
  ["vault", "Where does my video end up?", "Only with the buyer who paid, in a private vault. No download button, and their name is woven into every view, so a leak leads straight back to them."],
  ["money", "Will I get my money?", "The buyer pays before you start. ByRequest holds it and pays you automatically, at the latest 24 hours after delivery."],
  ["shield", "Who is on the other side?", "Every creator is ID checked, every buyer confirms 18+. You never share your number or socials, and you can block anyone in one tap."],
];

export default function Reassure({ variant = "list" }: { variant?: "list" | "strip" }) {
  const t = useT();
  return (<ul className={"rs rs-" + variant}>{ITEMS.map(([i, q, a]) => <li key={q}><span className="rs-i"><svg className="ico sm" aria-hidden="true"><use href={`#i-${i}`} /></svg></span><div><b>{t(q)}</b><p>{t(a)}</p></div></li>)}</ul>);
}
