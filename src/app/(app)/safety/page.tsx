import Link from "next/link";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth";
import { I } from "@/components/ui";

/* One place for everything about safety: what ByRequest does, and where to go when something is wrong. */
const ACTIONS: [href: string, icon: string, title: string, text: string][] = [
  ["/report", "alert", "Report a problem", "A request, a profile, a chat or a delivery that is not right. A person looks at every report."],
  ["/removal", "eyeoff", "Request removal", "You appear in something without your consent? We take it offline and block it from being uploaded again."],
  ["/settings#blocked", "block", "Block someone", "Block from a profile, a request or a chat. No more applications, chats or requests between you. They are not told."],
  ["/settings", "user", "Privacy settings", "Discreet notifications, a neutral tab name, quick hide, your data and deleting your account."],
  ["/legal/contact", "inbox", "Point of contact", "For authorities and for anyone who needs to reach ByRequest directly."],
];
const PROMISES = [
  ["Verified adults only", "Every creator is checked on age and identity before they can deliver."],
  ["Money held until it matches", "The payment partner holds the money. Not what was agreed? You get it back."],
  ["Chats nobody else can read", "Encrypted. Contact details and paying outside ByRequest are not allowed."],
  ["Every delivery checked", "Automatic checks and a person, before anything reaches a vault."],
];

export default async function Safety() {
  await requireUser();
  const { t } = await getT();
  return (<div className="wrap">
    <div className="page-h"><div><span className="eyebrow">{t("Trust and safety")}</span><h1 className="t-h1" style={{ marginTop: 6 }}>{t("Safe, private and fair")}</h1>
      <p className="muted" style={{ marginTop: 6, maxWidth: "60ch" }}>{t("What we do to protect everyone on ByRequest, and where to go when something is not right.")}</p></div></div>
    <div className="safe-grid">{ACTIONS.map(([href, icon, title, text]) => (
      <Link key={href} href={href} className="card safe-card"><span className="safe-ic"><I n={icon} /></span><div><b>{t(title)}</b><p>{t(text)}</p></div><I n="right" c="sm" /></Link>))}</div>
    <section className="sec"><div className="sec-h"><h2 className="t-h2">{t("What we always do")}</h2></div>
      <div className="safe-promises">{PROMISES.map(([h, d]) => <div key={h} className="card"><b>{t(h)}</b><p className="t-sm muted">{t(d)}</p></div>)}</div></section>
    <div className="safe-foot"><p><I n="alert" c="sm" />{t("In immediate danger? Call 112.")}</p>
      <nav aria-label={t("Legal")}><Link href="/legal/terms">{t("Terms of use")}</Link><Link href="/legal/privacy">{t("Privacy statement")}</Link><Link href="/legal/creator_agreement">{t("Creator agreement")}</Link></nav></div>
  </div>);
}
