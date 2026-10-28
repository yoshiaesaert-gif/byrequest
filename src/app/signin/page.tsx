import { getT } from "@/i18n/server";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { Cover, I } from "@/components/ui";
import SignInForm from "./form";
import LangSwitch from "@/components/lang-switch";

/* The public landing page. Two equal doors: people who want something made, and people who want
   to earn by making it. Both end in the same email sign in; the chosen door preselects the role. */
export default async function Landing({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { t } = await getT();
  if (await currentUser()) redirect("/");
  const as = (await searchParams).as;
  const intent = as === "earn" || as === "buy" ? as : undefined;
  const year = new Date().getFullYear();
  const legal: [string, string][] = [["/legal/terms", "Terms of use"], ["/legal/privacy", "Privacy statement"], ["/legal/creator_agreement", "Creator agreement"], ["/legal/participant_consent", "Consent to appear"], ["/legal/contact", "Point of contact"], ["/report", "Report a problem"], ["/removal", "Request removal"]];
  return (
    <div className="ld">
      <header className="ld-top">
        <a href="/signin" className="ld-logo" aria-label="ByRequest"><img src="/logo.png" alt="byrequest" /></a>
        <div className="ld-top-r"><span className="ld-18">18+</span><LangSwitch /><a href="#start" className="btn btn-secondary btn-sm">{t("Sign in")}</a></div>
      </header>

      <section className="ld-doors" aria-label={t("Choose how you use ByRequest")}>
        <a href="?as=buy#start" className="ld-door buy media">
          <Cover cover="c20" />
          <div className="fan" aria-hidden="true">
            {[["fc1", "c07", "Photo set", "Post workout photo set", "€36"], ["fc2", "c05", "Video · 10 min", "Shower video, calm and natural", "€80"], ["fc3", "c17", "Voice note", "Good night voice note", "€20"]].map(([k, c, b, title, p]) => (
              <div key={k} className={`fc ${k} media`}><Cover cover={c} /><span className="badge glass">{b.split(" · ").map((x) => t(x)).join(" · ")}</span><div><div className="t">{t(title)}</div><div className="p num">{p}</div></div></div>))}
          </div>
          <div className="ld-door-tx">
            <span className="ld-kick">{t("For buyers")}</span>
            <h1>{t("Ask for it.")}<br />{t("Someone makes it.")}</h1>
            <p>{t("Describe what you want and set your budget. Verified creators apply, you choose.")}</p>
            <span className="ld-cta">{t("Post a request")} <I n="right" c="sm" /></span>
          </div>
        </a>

        <a href="?as=earn#start" className="ld-door earn media">
          <img className="cimg" src="/img/tip_b2.webp" alt="" />
          <div className="ld-pay" aria-hidden="true">
            {[["Video · 10 min", "€64"], ["Voice note", "€16"], ["Photo set", "€29"]].map(([k, v], i) => (
              <div key={k} className="ld-pill glass" style={{ animationDelay: `${0.25 + i * 0.35}s` }}><span className="ld-pill-i"><I n="check" c="sm" /></span><span>{k.split(" · ").map((x) => t(x)).join(" · ")}</span><b className="num">+{v}</b></div>))}
          </div>
          <div className="ld-door-tx">
            <span className="ld-kick">{t("For creators")}</span>
            <h1>{t("Pick it.")}<br />{t("Make it.")} <em>{t("Get paid.")}</em></h1>
            <p>{t("No followers needed. Pick the requests you like, make them in your own time, get paid.")}</p>
            <span className="ld-cta">{t("Start earning")} <I n="right" c="sm" /></span>
          </div>
        </a>
      </section>

      <section className="ld-start" id="start">
        <div className="ld-card"><SignInForm intent={intent} />
          <ul className="ld-trust">{([["shield", "Adults only, ID checked"], ["lock", "Encrypted chat"], ["eyeoff", "No nudity in feeds"], ["vault", "Private vault"]] as const).map(([i, l]) => <li key={l}><span><I n={i} c="sm" /></span>{t(l)}</li>)}</ul>
        </div>
      </section>

      <section className="ld-how" aria-label={t("How it works")}>
        <div><span className="ld-kick dark">{t("For buyers")}</span><ol>
          <li><b>{t("Post your request")}</b><span>{t("What, how long and your budget. You pay when you post; the money is held until delivery.")}</span></li>
          <li><b>{t("Choose your creator")}</b><span>{t("Compare candidates on stars and finished deals. The price is fixed, no bidding.")}</span></li>
          <li><b>{t("Watch it in your vault")}</b><span>{t("Private, watermarked, only for you. Not right? You get your money back.")}</span></li></ol></div>
        <div><span className="ld-kick dark gold">{t("For creators")}</span><ol>
          <li><b>{t("Verify once")}</b><span>{t("ID and age, about 5 minutes. Your real name is never shown.")}</span></li>
          <li><b>{t("Apply for what you like")}</b><span>{t("You see the budget before you start. Face or not, you decide.")}</span></li>
          <li><b>{t("Deliver and get paid")}</b><span>{t("After the 24 hour check the money is yours. Payouts every Friday.")}</span></li></ol></div>
      </section>

      <footer className="ld-ft">
        <nav aria-label={t("Legal")}>{legal.map(([h, l]) => <a key={h} href={h}>{t(l)}</a>)}</nav>
        <p>{t("ByRequest is only for adults of 18 and older. Every creator is verified on age and identity before they can deliver. Content that breaks the law or our rules can be reported on every page.")}</p>
        <p>{t("ByRequest is operated by ByRequest LLC, a limited liability company under the laws of Delaware, United States. Payments appear on your statement as BRQ DIGITAL.")}</p>
        <p className="ld-copy">© {year} ByRequest LLC. {t("All rights reserved.")} {t("ByRequest and the ByRequest logo are trademarks of ByRequest LLC.")}</p>
      </footer>
    </div>
  );
}
