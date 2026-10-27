import { getT } from "@/i18n/server";
import Link from "next/link";
import { requireUser } from "@/server/auth";

export default async function StaffOnly() {
  const { t } = await getT();
  const u = await requireUser();
  return (<div className="wrap"><div className="bo-deny">
    <img src="/icon.png" alt="" width={56} height={56} />
    <h1 className="t-h1">{t("The back office is for the ByRequest team")}</h1>
    <p className="muted">{t("You are signed in as")} <b>{u.handle}</b>{t(", and this account has no team role yet. An admin can add it under Back office, Team.")}</p>
    <Link href="/" className="btn btn-secondary">{t("Back to home")}</Link>
  </div></div>);
}
