import Link from "next/link";

/* Single point of contact for authorities and users (DSA art. 11 and 12). */
export default function Contact() {
  return (<div className="sbx" style={{ background: "var(--paper)" }}><div className="card" style={{ width: "min(620px,100%)", display: "flex", flexDirection: "column", gap: 12 }}>
    <Link href="/"><img src="/logo.png" alt="byrequest" style={{ height: 36 }} /></Link>
    <h1 className="t-h2">Point of contact</h1>
    <p className="t-sm">For authorities, the European Commission and the Digital Services Coordinators: <b>authorities@byrequest.app</b>. Languages: Dutch, English, French.</p>
    <p className="t-sm">For users and anyone else: <b>support@byrequest.app</b>, or the inbox in the app.</p>
    <p className="t-sm">To report illegal content or abuse, with or without an account: <Link href="/report">/report</Link>. To have content with you in it removed: <Link href="/removal">/removal</Link>.</p>
    <p className="t-sm">Privacy and data protection: <b>privacy@byrequest.app</b>.</p>
    <p className="t-xs muted">Company details, registered address and enterprise number are published here once the company is registered. Draft pending legal review.</p>
  </div></div>);
}
