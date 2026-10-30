import { getT } from "@/i18n/server";
import Link from "next/link";
import { COMPANY } from "@/config/company";

/* Single point of contact for authorities and users (DSA art. 11 and 12). */
export default async function Contact() {
  const { t } = await getT();
  return (<div className="sbx" style={{ background: "var(--paper)" }}><div className="card" style={{ width: "min(620px,100%)", display: "flex", flexDirection: "column", gap: 12 }}>
    <Link href="/"><img src="/logo.png" alt="byrequest" style={{ height: 36 }} /></Link>
    <h1 className="t-h2">{t("Point of contact")}</h1>
    <p className="t-sm">{t("For authorities, the European Commission and the Digital Services Coordinators:")} <b>{t("authorities@byrequest.me")}</b>{t(". Languages: Dutch, English, French.")}</p>
    <p className="t-sm">{t("For users and anyone else:")} <b>byrequest.me/contact</b>{t(", or the inbox in the app.")}</p>
    <p className="t-sm">{t("To report illegal content or abuse, with or without an account:")} <Link href="/report">{t("/report")}</Link>{t(". To have content with you in it removed:")} <Link href="/removal">{t("/removal")}</Link>.</p>
    <p className="t-sm">{t("Privacy and data protection:")} <b>{t("privacy@byrequest.me")}</b>.</p>
    <p className="t-sm">{t("Operator:")} <b>{COMPANY.name}</b>, {t("a limited liability company under the laws of Delaware, United States, file number {n}.", { n: COMPANY.file })} {t("Registered office:")} {COMPANY.address}.</p>
  </div></div>);
}
