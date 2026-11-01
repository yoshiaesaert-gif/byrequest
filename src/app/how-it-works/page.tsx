import Link from "next/link";
import { getT } from "@/i18n/server";
import PubShell from "@/components/pub-shell";
import { share } from "@/config/share";

export const metadata = share({ title: "How ByRequest works", description: "Post a request with your budget, a verified creator makes it, the payment is held until delivery, and it arrives in your private vault. No public feed.", path: "/how-it-works", index: true });

/* How it works, for buyers and creators. Neutral and public, so it can be shared anywhere. */
const BUYER = [
  ["Post a request", "Describe what you would like and set your budget. Only verified creators see it, there is no public feed."],
  ["Choose a creator", "Creators who want to make it apply. You compare profiles and ratings and choose one."],
  ["Payment held safely", "You pay through the payment partner. The money is held until the delivery matches what was agreed."],
  ["Private delivery", "It arrives in your private vault inside ByRequest. Only you can open it, nothing is posted anywhere."],
] as const;
const CREATOR = [
  ["Verify once", "A quick ID and age check with our verification partner. Your name and ID are never shown."],
  ["Pick what fits you", "Browse requests with their budget and apply only to what you want to make."],
  ["Make it your way", "Chat privately with the buyer, make it, and upload it in the app."],
  ["Get paid", "The budget was reserved before you started. After delivery it is released to you automatically."],
] as const;
const TRUST = [
  ["Adults only", "Every creator is checked on age and identity. Buyers confirm their age too."],
  ["No public feed", "Nothing is published. Requests and deliveries stay between the two people involved."],
  ["Secure checkout", "Your payment is held until the delivery is accepted, and refunded if it does not match."],
  ["Private by design", "Encrypted chats, a discreet name on your bank statement and no contact details shared."],
] as const;

export default async function HowItWorks() {
  const { t } = await getT();
  const steps = (list: readonly (readonly [string, string])[]) => <ol className="hw2-steps">{list.map(([h, p], i) => <li key={h}><span>{i + 1}</span><div><b>{t(h)}</b><p>{t(p)}</p></div></li>)}</ol>;
  return (<PubShell><div className="wrap hw2">
    <header className="hw2-h"><span className="eyebrow">{t("How it works")}</span><h1 className="t-h1">{t("Custom content, made on request")}</h1>
      <p className="muted">{t("ByRequest connects people who want something made just for them with verified creators. Clear budgets, a secure checkout and private delivery.")}</p></header>
    <div className="hw2-cols">
      <section className="card hw2-col"><h2>{t("If you want something")}</h2>{steps(BUYER)}<Link href="/signin?as=buy" className="btn btn-primary btn-block">{t("Post a request")}</Link></section>
      <section className="card hw2-col"><h2>{t("If you create")}</h2>{steps(CREATOR)}<Link href="/creators" className="btn btn-secondary btn-block">{t("Start as a creator")}</Link></section>
    </div>
    <section className="hw2-trust">{TRUST.map(([h, p]) => <div key={h} className="card"><b>{t(h)}</b><p className="t-sm muted">{t(p)}</p></div>)}</section>
    <p className="hw2-more">{t("Questions?")} <Link href="/help">{t("Help centre")}</Link> · <Link href="/safety">{t("Safety")}</Link></p>
  </div></PubShell>);
}
