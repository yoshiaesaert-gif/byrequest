import { getT } from "@/i18n/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { fileReport, REPORT_KINDS } from "@/server/reports";

/* Anyone can report, with or without an account. Reachable from every profile, request and deal,
   and from the footer. */
export default async function Report({ searchParams }: { searchParams: Promise<{ sent?: string; e?: string; type?: string; ref?: string; kind?: string }> }) {
  const { t } = await getT();
  const sp = await searchParams;
  const me = await currentUser();
  return (<div className="sbx" style={{ background: "var(--paper)" }}><form className="card rp" style={{ width: "min(620px,100%)" }} action={async (f) => {
    "use server";
    const u = await currentUser();
    let ok = true;
    try { await fileReport({ kind: String(f.get("kind") ?? ""), details: String(f.get("details") ?? ""), contact: String(f.get("contact") ?? ""), targetType: String(f.get("type") ?? ""), targetRef: String(f.get("ref") ?? "") }, u?.id ?? null); }
    catch { ok = false; }
    redirect(ok ? "/report?sent=1" : `/report?e=1&type=${encodeURIComponent(String(f.get("type") ?? ""))}&ref=${encodeURIComponent(String(f.get("ref") ?? ""))}`);
  }}>
    <Link href="/"><img src="/logo.png" alt="byrequest" style={{ height: 36 }} /></Link>
    <h1 className="t-h2">{t("Report a problem")}</h1>
    <p className="rp-urgent"><b>{t("Is someone in danger right now?")}</b> {t("Call 112. This form is read by people, but not around the clock.")}</p>
    {sp.sent ? <p>{t("Thank you. A person reviews every report, the most serious ones first. Suspected exploitation, trafficking or a minor is passed to the police.")} {me ? "You can follow up through your inbox." : "We reply through the contact you gave, if any."}</p> : (<>
      {sp.e ? <p className="formerr">{t("Choose what you report and describe it in a few words.")}</p> : null}
      <fieldset className="rp-kinds"><legend>{t("What do you want to report?")}</legend>
        {Object.entries(REPORT_KINDS).map(([k, l]) => <label key={k} className="check"><input type="radio" name="kind" value={k} defaultChecked={sp.kind === k} required /> <span>{t(l)}</span></label>)}
      </fieldset>
      <input type="hidden" name="type" value={sp.type ?? ""} /><input type="hidden" name="ref" value={sp.ref ?? ""} />
      {sp.ref ? <p className="t-sm muted">{t("About:")} {sp.type} {sp.ref.slice(0, 8)}</p> : null}
      <div className="field"><label htmlFor="d">{t("What happened")}</label><textarea id="d" name="details" className="input" rows={5} style={{ height: "auto", padding: 14 }} required placeholder={t("A username, a link, what was said. From a chat, you can paste the messages you want to share: we never read your chats, so we only see what you paste.")} /></div>
      {!me ? <div className="field"><label htmlFor="c">{t("How can we reach you? Optional")}</label><input id="c" name="contact" className="input" placeholder={t("Email or phone")} /></div> : null}
      <button className="btn btn-primary btn-lg">{t("Send report")}</button>
      <p className="t-xs muted">{t("Contact details are stored encrypted and used only for this report. You can also report anonymously.")}</p>
      <div className="rp-help"><b>{t("Help outside ByRequest")}</b>
        <span>{t("Belgium: the recognised centres for victims of human trafficking Payoke, PAG-ASA and Sürya, or the police.")}</span>
        <span>{t("Netherlands: CoMensha and Fier, or the police.")}</span>
        <span>{t("Intimate images shared without consent: StopNCII.org can block them on participating platforms.")}</span></div></>)}
  </form></div>);
}
