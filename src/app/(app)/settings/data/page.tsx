import Link from "next/link";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth";
import { I } from "@/components/ui";

/* Your rights under the GDPR, kept out of the way but always reachable from the bottom of settings:
   a copy of your data, the privacy statement and how to reach us. */
export default async function DataRights() {
  await requireUser();
  const { t } = await getT();
  return (<div className="wrap del">
    <Link href="/settings" className="back"><I n="left" c="sm" />{t("Profile and privacy")}</Link>
    <h1 className="t-h1">{t("Your data and rights")}</h1>
    <p className="muted" style={{ maxWidth: "60ch", marginTop: 8 }}>{t("The law gives you the right to see what we keep about you and to take it with you. You can ask for it here, any time.")}</p>
    <div className="card group" style={{ marginTop: 20 }}>
      <div className="setrow"><div><b>{t("A copy of your data")}</b><span className="s">{t("One file with your account, requests, deals and settings")}</span></div><a href="/api/me/export" className="btn btn-secondary btn-sm">{t("Download")}</a></div>
      <div className="setrow"><div><b>{t("Privacy statement")}</b><span className="s">{t("What we keep, why, and for how long")}</span></div><Link href="/legal/privacy" className="btn btn-secondary btn-sm">{t("Read")}</Link></div>
      <div className="setrow"><div><b>{t("Questions or a complaint")}</b><span className="s">{t("Our point of contact answers every question about your data")}</span></div><Link href="/legal/contact" className="btn btn-secondary btn-sm">{t("Contact")}</Link></div>
    </div>
  </div>);
}
