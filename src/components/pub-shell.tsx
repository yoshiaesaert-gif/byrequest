import Link from "next/link";
import { getT } from "@/i18n/server";
import { COMPANY } from "@/config/company";

/* Header and footer for the public, share-safe pages: logo, sign in, start, and the legal links. */
export default async function PubShell({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (<div className="pub">
    <header className="pub-top"><Link href="/" aria-label="ByRequest"><img src="/logo.png" alt="byrequest" /></Link>
      <nav><Link href="/how-it-works">{t("How it works")}</Link><Link href="/safety">{t("Safety")}</Link><Link href="/signin" className="btn btn-primary btn-sm">{t("Sign in")}</Link></nav></header>
    <main className="pub-main">{children}</main>
    <footer className="pub-foot"><nav aria-label={t("Legal")}><Link href="/legal/terms">{t("Terms of use")}</Link><Link href="/legal/privacy">{t("Privacy statement")}</Link><Link href="/help">{t("Help centre")}</Link><Link href="/contact">{t("Send us a message")}</Link></nav>
      <p>{t("Only for adults of 18 and older.")} © {new Date().getFullYear()} {COMPANY.name}</p></footer>
  </div>);
}
