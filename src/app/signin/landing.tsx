"use client";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import LangSwitch from "@/components/lang-switch";
import SignInForm from "./form";

/* One screen: the board on the left, sign in on the right. A switch on the image speaks to either
   side: buyers see what they pay, creators see the same requests as what they earn. The choice
   carries into sign up. */
const CARDS = [
  { k: "fc1", cover: "c07", badge: "Photo set", title: "Post workout photo set", pay: 36, earn: 29 },
  { k: "fc2", cover: "c05", badge: "Video · 10 min", title: "Shower video, calm and natural", pay: 80, earn: 64 },
  { k: "fc3", cover: "c17", badge: "Voice note", title: "Good night voice note", pay: 20, earn: 16 },
] as const;
const LEGAL: [string, string][] = [["/legal/terms", "Terms of use"], ["/legal/privacy", "Privacy statement"], ["/legal/creator_agreement", "Creator agreement"], ["/legal/participant_consent", "Consent to appear"], ["/legal/contact", "Point of contact"], ["/report", "Report a problem"], ["/removal", "Request removal"]];
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;

export default function Landing({ initial, year }: { initial?: "buy" | "earn"; year: number }) {
  const t = useT();
  const [side, setSide] = useState<"buy" | "earn">(initial ?? "earn");
  // Creators first, then the two sides take turns every 5 seconds. A click on the switch restarts the
  // count from that side; the turns stop only once the visitor starts typing.
  const [auto, setAuto] = useState(true);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const h = setTimeout(() => setSide((x) => (x === "earn" ? "buy" : "earn")), 5000);
    return () => clearTimeout(h);
  }, [auto, side, turn]);
  const pick = (x: "buy" | "earn") => { setSide(x); setTurn((n) => n + 1); };
  const earn = side === "earn";
  const steps = earn
    ? [["Verify", "ID and age, 5 minutes"], ["Apply", "For what you like"], ["Get paid", "Every Friday"]]
    : [["Post", "What and your budget"], ["Choose", "Verified creators apply"], ["Watch", "Private, in your vault"]];
  return (
    <div className={"lp" + (earn ? " is-earn" : "")}>
      <section className="lp-vis media">
        <img className="cimg" src="/img/c20.webp" alt="" />
        <img className="cimg lp-img2" src="/img/tip_b2.webp" alt="" />
        <span className="lp-warm" aria-hidden="true" />
        {auto ? <span className="lp-prog" aria-hidden="true"><b key={side + turn} /></span> : null}
        <div className="lp-vis-top"><img className="lp-logo" src="/logo_white.png" alt="byrequest" /><span className="lp-18">18+</span></div>

        <div className="fan lp-board" aria-hidden="true">
          {CARDS.map((c) => (
            <div key={c.k} className={`fc ${c.k} media`}><img className="cimg" src={`/img/${c.cover}.webp`} alt="" /><span className="cscrim" />
              <span className="badge glass">{c.badge.split(" · ").map((x) => t(x)).join(" · ")}</span>
              <div><div className="t">{t(c.title)}</div>
                <div className="p num">{earn ? <span className="lp-earn">+€{c.earn}</span> : `€${c.pay}`}</div>
                {earn ? <div className="lp-for">{t("for you")}</div> : null}</div></div>))}
        </div>

        <div className="lp-copy">
          <div className="lp-switch" role="tablist" aria-label={t("Choose how you use ByRequest")}>
            <button role="tab" aria-selected={earn} className={earn ? "on" : ""} onClick={() => pick("earn")}>{t("I want to earn")}</button>
            <button role="tab" aria-selected={!earn} className={!earn ? "on" : ""} onClick={() => pick("buy")}>{t("I want something")}</button>
            <i aria-hidden="true" />
          </div>
          <h1 key={side}>{earn ? <>{t("Pick it.")} {t("Make it.")}<br /><em>{t("Get paid.")}</em></> : <>{t("Ask for it.")}<br />{t("Someone makes it.")}</>}</h1>
          <ol className="lp-steps" key={side + "s"}>{steps.map(([h, d], i) => <li key={h}><span className="num">{i + 1}</span><div><b>{t(h)}</b><small>{t(d)}</small></div></li>)}</ol>
        </div>
      </section>

      <section className="lp-side" id="start">
        <LangSwitch className="lp-lang" />
        <div className="lp-form" onFocusCapture={() => setAuto(false)}>
          <SignInForm intent={side} />
          <ul className="ld-trust">{([["shield", "Adults only, ID checked"], ["lock", "Encrypted chat"], ["eyeoff", "No nudity in feeds"], ["vault", "Private vault"]] as const).map(([i, l]) => <li key={l}><span><Ico n={i} c="sm" /></span>{t(l)}</li>)}</ul>
        </div>
        <footer className="lp-legal">
          <nav aria-label={t("Legal")}>{LEGAL.map(([h, l]) => <a key={h} href={h}>{t(l)}</a>)}</nav>
          <p>{t("Only for adults of 18 and older. Every creator is verified on age and identity. ByRequest is operated by ByRequest LLC, Delaware, United States. Payments show as BRQ DIGITAL.")}</p>
          <p>© {year} ByRequest LLC. {t("All rights reserved.")}</p>
        </footer>
      </section>
    </div>
  );
}
