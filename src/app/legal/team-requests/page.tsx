import Link from "next/link";

/* Explains requests posted by the ByRequest team. Linked from every such request. */
export default function TeamRequests() {
  return (<div className="sbx" style={{ background: "var(--paper)" }}><div className="card" style={{ width: "min(620px,100%)", display: "flex", flexDirection: "column", gap: 12 }}>
    <Link href="/"><img src="/logo.png" alt="byrequest" style={{ height: 36 }} /></Link>
    <h1 className="t-h2">Requests by the ByRequest team</h1>
    <p className="t-sm">Some requests are posted by the ByRequest team. They are marked <b>by ByRequest</b>. They work like every other request:</p>
    <ul className="t-sm" style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
      <li>The budget is real. When we accept your offer, the payment is secured and you are paid after review, like any deal.</li>
      <li>We accept offers that fit the request. Not every offer can win, as with any request.</li>
      <li>Reviews from these deals are real reviews from a finished deal, by the ByRequest team.</li>
      <li>What you deliver is used only within ByRequest, never published elsewhere without your separate permission.</li>
    </ul>
  </div></div>);
}
