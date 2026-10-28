import { getT } from "@/i18n/server";
import { legalIn } from "@/legal/translations";
import { notFound } from "next/navigation";
import * as P from "@/server/participants";
import { currentDoc } from "@/server/onboarding";
import { CAT_LABEL, amountLabel } from "@/domain/rules";
import { PROVIDER_ENV } from "@/config/compliance";
import { verify, give, decline } from "./actions";

/* Private link for someone who appears in a creator's content. No account needed. */
export default async function Consent({ params }: { params: Promise<{ token: string }> }) {
  const { t, locale } = await getT();
  const { token } = await params;
  const p = await P.byToken(token);
  if (!p) notFound();
  const [rows, doc] = await Promise.all([P.pendingFor(p.id), currentDoc("participant_consent")]);
  return (<div className="sbx" style={{ background: "var(--paper)" }}><div className="card" style={{ width: "min(560px,100%)" }}>
    <img src="/logo.png" alt="byrequest" style={{ height: 40, alignSelf: "flex-start" }} />
    <h1 className="t-h2">{t("You were added to a creator’s content")}</h1>
    <p className="t-sm muted">{t("Before anything with you in it is shared, ByRequest needs to confirm you are an adult and that you agree. Nothing is shared without that. You can decline or withdraw at any time.")}</p>
    <div className="checklist">
      <div className="row"><div><b>{t("1. Verify you are 18 or older")}</b><div className="t-sm muted">{t("With an ID document and a live selfie at our verification partner. Your name is never shown to anyone on ByRequest.")}</div></div>
        {p.identity === "approved" ? <span className="status st-approved">{t("Verified")}</span> : p.identity === "pending" ? <span className="status st-pending">{t("Being reviewed")}</span>
          : <form action={async () => { "use server"; await verify(token); }}><button className="btn btn-primary btn-sm">{p.identity === "not_started" ? "Verify" : "Verify again"}</button></form>}</div>
    </div>
    <div><b>{t("2. Your consent per delivery")}</b>
      {rows.length === 0 ? <p className="t-sm muted" style={{ marginTop: 6 }}>{t("Nothing is waiting for you right now.")}</p> : rows.map(({ dl, title, category, amount, consent }) => (
        <div key={dl.id} className="card" style={{ padding: 16, marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <div><b>{title}</b><div className="t-sm muted">{CAT_LABEL[category]} · {amountLabel(category, amount)} · for one buyer, private vault only</div></div>
          {consent?.withdrawnAt ? <span className="status st-rejected">{t("Declined or withdrawn")}</span>
            : consent?.depicted && consent.distribution ? (<><span className="status st-approved">{t("You agreed")}</span>
              <form action={async () => { "use server"; await decline(token, dl.id); }}><button className="btn btn-secondary btn-sm">{t("Withdraw my consent")}</button></form></>)
            : p.identity !== "approved" ? <span className="t-sm muted">{t("Verify first, then you can agree or decline.")}</span>
            : (<><ul className="docsum">{((doc && legalIn(locale, "participant_consent", doc.version)?.summary) ?? doc?.summary ?? []).map((s) => <li key={s}><svg className="ico sm" aria-hidden="true"><use href="#i-check" /></svg>{s}</li>)}</ul>
              <p className="t-xs muted">{doc ? t("{title}, version {v}.", { title: legalIn(locale, "participant_consent", doc.version)?.title ?? doc.title, v: doc.version }) : ""} <a href="/legal/participant_consent" target="_blank" style={{ fontWeight: 600 }}>{t("Read the full text")}</a></p>
              <div className="optrow"><form action={async () => { "use server"; await give(token, dl.id); }}><button className="btn btn-primary btn-sm">{t("I appear voluntarily and agree")}</button></form>
                <form action={async () => { "use server"; await decline(token, dl.id); }}><button className="btn btn-secondary btn-sm">{t("Decline")}</button></form></div></>)}
        </div>))}
    </div>
    <p className="t-xs muted">{t("Appear in something without being asked? Use")} <a href="/removal" style={{ fontWeight: 600 }}>{t("byrequest.me/removal")}</a>.</p>
  </div></div>);
}
