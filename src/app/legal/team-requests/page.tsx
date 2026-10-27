import { getT } from "@/i18n/server";
import Link from "next/link";

/* Explains requests posted by the ByRequest team. Linked from every such request. */
export default async function TeamRequests() {
  const { t } = await getT();
  return (<div className="sbx" style={{ background: "var(--paper)" }}><div className="card" style={{ width: "min(620px,100%)", display: "flex", flexDirection: "column", gap: 12 }}>
    <Link href="/"><img src="/logo.png" alt="byrequest" style={{ height: 36 }} /></Link>
    <h1 className="t-h2">{t("Requests by the ByRequest team")}</h1>
    <p className="t-sm">{t("Some requests are posted by the ByRequest team. They are marked")} <b>{t("by ByRequest")}</b>{t(". They work like every other request:")}</p>
    <ul className="t-sm" style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
      <li>{t("The budget is real. When we accept your offer, the payment is secured and you are paid after review, like any deal.")}</li>
      <li>{t("We accept offers that fit the request. Not every offer can win, as with any request.")}</li>
      <li>{t("Reviews from these deals are real reviews from a finished deal, by the ByRequest team.")}</li>
      <li>{t("What you deliver is used only within ByRequest, never published elsewhere without your separate permission.")}</li>
    </ul>
  </div></div>);
}
