import Link from "next/link";
import { getT } from "@/i18n/server";

/* Shown for any address that does not exist or is no longer available: never a dead end. */
export default async function NotFound() {
  const { t } = await getT();
  return (<div className="nf">
    <Link href="/" className="nf-logo" aria-label="ByRequest"><img src="/logo.png" alt="byrequest" /></Link>
    <div className="nf-card">
      <span className="nf-code num">404</span>
      <h1>{t("This page is not available")}</h1>
      <p>{t("It may have been closed, removed, or it belongs to another account.")}</p>
      <div className="nf-acts"><Link href="/" className="btn btn-primary btn-lg">{t("Back to home")}</Link><Link href="/inbox" className="btn btn-secondary btn-lg">{t("Inbox")}</Link></div>
    </div>
  </div>);
}
