import Link from "next/link";
import { getT } from "@/i18n/server";
import LangSwitch from "./lang-switch";
import { DEMO_MODE } from "@/config/compliance";

/* Site footer. Neutral wording, no imagery, nothing that reveals what ByRequest is on a shared screen. */
export default async function Footer() {
  const { t } = await getT();
  const year = new Date().getFullYear();
  const col = (h: string, links: [string, string][]) => (
    <div className="ft-col"><b>{t(h)}</b>{links.map(([href, l]) => <Link key={href + l} href={href}>{l.includes("@") ? l : t(l)}</Link>)}</div>);
  return (
    <footer className="ft">
      <div className="ft-in">
        <div className="ft-brand">
          <img className="ft-logo" src="/logo_white.png" alt="byrequest" />
          <p>{t("Personal content made to order, between verified adults. Private by design.")}</p>
          <div className="ft-badges"><span>{t("18+ only")}</span><span>{t("ID verified creators")}</span><span>{t("End to end encrypted")}</span></div>
          <LangSwitch className="ft-lang" />
        </div>
        {col("Explore", [["/for-you", "The board"], ["/post", "Post a request"], ["/vault", "Your vault"], ["/deals", "Deals"]])}
        {col("Create", [["/settings#creator", "Become a creator"], ["/studio", "Studio"], ["/legal/creator_agreement", "Creator agreement"], ["/onboarding", "Creator setup"]])}
        {col("Trust", [["/legal/privacy", "Privacy statement"], ["/legal/terms", "Terms of use"], ["/report", "Report a problem"], ["/removal", "Request removal"], ["/legal/participant_consent", "Consent to appear"]])}
        {col("Help", [["/inbox", "Support inbox"], ["/settings", "Privacy settings"], ["/legal/contact", "Point of contact"], ["mailto:support@byrequest.app", "support@byrequest.app"]])}
      </div>
      <div className="ft-bottom">
        <span>© {year} ByRequest</span>
        <span>{t("Payments appear as BRQ DIGITAL")}</span>
        <span>{t("Press Esc twice to quick hide")}</span>
      </div>
    </footer>
  );
}
