import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/i18n/server";
import { DRAFT_NOTE, legalIn } from "@/legal/translations";

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
  const lines = tr ? [`# ${tr.title}`, DRAFT_NOTE[locale as "nl" | "fr"], ...tr.body] : d.body.split("\n").filter(Boolean);
  const html = lines.map((l, i) => l.startsWith("# ") ? <h1 key={i}>{l.slice(2)}</h1> : <p key={i}>{l}</p>);
  return (<div className="wrap"><article className="doc">
    <img src="/logo.png" alt="byrequest" style={{ height: 40, marginBottom: 24 }} />
    {!tr && locale !== "en" && !(await searchParams).orig ? <p className="banner info" style={{ marginBottom: 20 }}>{t("This older version is only available in English, the language it was recorded in.")}</p> : null}
    {html}
    <footer className="doc-meta">
      {tr ? <p>{t("Translation of version {v}. The recorded text is the English original.", { v: d.version })} <a href={`?${d.current ? "" : `v=${d.version}&`}orig=1`}>{t("Read the original")}</a></p> : null}
      <p>{t("Version {v} · published {date}", { v: d.version, date: d.publishedAt.toISOString().slice(0, 10) })}{d.status !== "approved" ? ` · ${t("draft pending legal and payment partner review")}` : ""}</p>
      <p className="doc-hash">SHA-256 <code>{d.sha256}</code></p>
      {all.length > 1 ? <div className="doc-vers"><span>{t("Other versions:")}</span>{all.filter((x) => x.id !== d.id).map((x) => <a key={x.id} href={`?v=${x.version}`}>{x.version}</a>)}</div> : null}
    </footer>
  </article></div>);
}
