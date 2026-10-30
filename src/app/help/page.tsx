import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { HELP, pick } from "@/content/help";
import HelpCenter from "./center";

export const metadata: Metadata = { title: "Help" };

/* The help centre: every question in the user's language, searchable, open to everyone. */
export default async function Help() {
  const { t, locale } = await getT();
  const cats = HELP.map((c) => ({ id: c.id, icon: c.icon, title: pick(c.title, locale), sub: pick(c.sub, locale),
    items: c.items.map((i) => ({ id: `${c.id}-${i.id}`, q: pick(i.q, locale), a: pick(i.a, locale), href: i.href, cta: i.cta ? pick(i.cta, locale) : undefined })) }));
  return (<div className="hc">
    <header className="hc-top"><Link href="/"><img src="/logo.png" alt="byrequest" style={{ height: 30 }} /></Link><Link href="/" className="btn btn-secondary btn-sm">{t("Back")}</Link></header>
    <HelpCenter cats={cats} labels={{ title: t("How can we help?"), sub: t("Every question about ByRequest, answered. Search or browse by topic."), search: t("Search the help centre"), none: t("No answer found. Try other words, or write to us."), more: t("Go there"), count: t("{n} answers"), still: t("Still a question?"), mail: t("Send us a message"), all: t("All topics"), popular: t("Popular"), report: t("Report a problem") }} />
  </div>);
}
