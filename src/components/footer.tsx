import Link from "next/link";

/* Site footer. Neutral wording, no imagery, nothing that reveals what ByRequest is on a shared screen. */
export default function Footer() {
  const year = new Date().getFullYear();
  const col = (t: string, links: [string, string][]) => (
    <div className="ft-col"><b>{t}</b>{links.map(([h, l]) => <Link key={h + l} href={h}>{l}</Link>)}</div>);
  return (
    <footer className="ft">
      <div className="ft-in">
        <div className="ft-brand">
          <img className="ft-logo" src="/logo_white.png" alt="byrequest" />
          <p>Personal content made to order, between verified adults. Private by design.</p>
          <div className="ft-badges"><span>18+ only</span><span>ID verified creators</span><span>End to end encrypted</span></div>
        </div>
        {col("Explore", [["/for-you", "The board"], ["/post", "Post a request"], ["/vault", "Your vault"], ["/deals", "Deals"]])}
        {col("Create", [["/settings#creator", "Become a creator"], ["/studio", "Studio"], ["/legal/creator_agreement", "Creator agreement"], ["/onboarding", "Creator setup"]])}
        {col("Trust", [["/legal/privacy", "Privacy statement"], ["/legal/terms", "Terms of use"], ["/report", "Report a problem"], ["/removal", "Request removal"], ["/legal/participant_consent", "Consent to appear"]])}
        {col("Help", [["/inbox", "Support inbox"], ["/settings", "Privacy settings"], ["/legal/contact", "Point of contact"], ["mailto:support@byrequest.app", "support@byrequest.app"]])}
      </div>
      <div className="ft-bottom">
        <span>© {year} ByRequest</span>
        <span>Payments appear as BRQ DIGITAL</span>
        <span>Press Esc twice to quick hide</span>
      </div>
    </footer>
  );
}
