"use client";
import { useT } from "@/i18n/client";

/* Why creators trust ByRequest, in their own words: the vault, anonymity, no numbers, money up front.
   Tracing stays a quiet footnote: it is there, it is not the pitch. */
export const USP: [icon: string, q: string, a: string][] = [
  ["vault", "A vault built like a safe", "Your content only opens for the buyer who paid, inside ByRequest. No download, no copy. It disappears by itself after the period you choose."],
  ["eyeoff", "Nobody knows who you are", "No name, no face needed, your ID is never shown. Buyers only see a username and an avatar."],
  ["lock", "No numbers, nothing odd in your inbox", "Chat, delivery and payment stay on ByRequest, so nobody gets your number or socials. Emails and alerts read neutral, your bank shows BRQ DIGITAL and nobody on ByRequest ever sees your email address."],
  ["user", "Nothing to post, no feed to fill", "No real name, no gallery, no content up front. Your profile is a few lines of text. Photos only come in when a buyer is interested in you: you choose a few, and they vanish after 10 seconds."],
  ["check", "Stars keep everyone honest", "After every deal buyer and creator rate each other. Whoever behaves badly runs out of deals fast. So everyone behaves."],
  ["money", "Paid before you start", "The buyer pays up front. ByRequest holds it and pays you automatically, at the latest 24 hours after delivery."],
];
export const USP_NOTE = "Every view carries an invisible mark. If anything ever leaks, we trace it and take it offline.";

export default function Reassure({ variant = "list" }: { variant?: "list" | "band" }) {
  const t = useT();
  if (variant === "band") return (<section className="rs-band">
    <div className="rs-band-h"><span className="eyebrow">{t("Private by design")}</span><h2>{t("Your content stays yours. Your name stays secret.")}</h2></div>
    <ul>{USP.map(([i, q, a]) => <li key={q}><span className="rs-i"><svg className="ico" aria-hidden="true"><use href={`#i-${i}`} /></svg></span><b>{t(q)}</b><p>{t(a)}</p></li>)}</ul>
    <p className="rs-note">{t(USP_NOTE)} {t("Keep logos, team kit and rooms people recognise out of the shot.")}</p>
  </section>);
  return (<div className="rs rs-list"><ul>{USP.map(([i, q, a]) => <li key={q}><span className="rs-i"><svg className="ico sm" aria-hidden="true"><use href={`#i-${i}`} /></svg></span><div><b>{t(q)}</b><p>{t(a)}</p></div></li>)}</ul><p className="rs-note">{t(USP_NOTE)}</p></div>);
}

/* The short version for the dark landing hero: four big promises. */
export function UspPills() {
  const t = useT();
  return <ul className="lp-usp">{USP.filter((_, k) => k < 3 || k === 5).map(([i, q]) => <li key={q}><svg className="ico" aria-hidden="true"><use href={`#i-${i}`} /></svg>{t(q)}</li>)}</ul>;
}
