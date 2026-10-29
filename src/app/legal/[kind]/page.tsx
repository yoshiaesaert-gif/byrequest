import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/i18n/server";
import { legalIn } from "@/legal/translations";

const KINDS = ["terms", "privacy", "creator_agreement", "participant_consent"] as const;

export default async function Legal({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ v?: string; orig?: string }> }) {
  const { kind } = await params;
  const { t, locale } = await getT();
  if (!KINDS.includes(kind as "terms")) notFound();
  const v = (await searchParams).v;
  const all = await db.select().from(schema.documents).where(eq(schema.documents.kind, kind as "terms")).orderBy(desc(schema.documents.publishedAt));
  const d = v ? all.find((x) => x.version === v) : all.find((x) => x.current) ?? all[0];
  if (!d) notFound();
  // In Dutch or French the translation of this exact version is shown; the recorded English text stays one tap away.
  const tr = (await searchParams).orig ? null : legalIn(locale, d.kind, d.version);
  // Review notes are for us, not for readers: they never show on the page.
  const lines = (tr ? [`# ${tr.title}`, ...tr.body] : d.body.split("\n").filter(Boolean)).filter((l) => !/payment partner review|na te kijken door juristen|relecture juridique/i.test(l));
  const html = lines.map((l, i) => l.startsWith("# ") ? <h1 key={i}>{l.slice(2)}</h1> : <p key={i}>{l}</p>);
  return (<div className="wrap"><article className="doc">
    <img src="/logo.png" alt="byrequest" style={{ height: 40, marginBottom: 24 }} />
    {!tr && locale !== "en" && !(await searchParams).orig ? <p className="banner info" style={{ marginBottom: 20 }}>{t("This older version is only available in English, the language it was recorded in.")}</p> : null}
    {html}
    <footer className="doc-meta">
      {tr ? <p>{t("Translation. The English text is the original.")} <a href={`?${d.current ? "" : `v=${d.version}&`}orig=1`}>{t("Read the original")}</a></p> : null}
      <p>{t("Last updated {date}", { date: d.publishedAt.toISOString().slice(0, 10) })}</p>
      <p className="doc-hash">SHA-256 <code>{d.sha256}</code></p>
    </footer>
  </article></div>);
}
