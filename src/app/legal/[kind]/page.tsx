import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const KINDS = ["terms", "privacy", "creator_agreement", "participant_consent"] as const;

export default async function Legal({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ v?: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind as "terms")) notFound();
  const v = (await searchParams).v;
  const all = await db.select().from(schema.documents).where(eq(schema.documents.kind, kind as "terms")).orderBy(desc(schema.documents.publishedAt));
  const d = v ? all.find((x) => x.version === v) : all.find((x) => x.current) ?? all[0];
  if (!d) notFound();
  const html = d.body.split("\n").filter(Boolean).map((l, i) => l.startsWith("# ") ? <h1 key={i}>{l.slice(2)}</h1> : <p key={i}>{l}</p>);
  return (<div className="wrap"><article className="doc">
    <img src="/logo.png" alt="byrequest" style={{ height: 40, marginBottom: 24 }} />
    {html}
    <p className="t-xs muted" style={{ marginTop: 28 }}>Version {d.version} · published {d.publishedAt.toISOString().slice(0, 10)} · SHA-256 {d.sha256}{d.status !== "approved" ? " · draft pending legal and payment partner review" : ""}</p>
    {all.length > 1 ? <p className="t-xs muted">Other versions: {all.filter((x) => x.id !== d.id).map((x) => <a key={x.id} href={`?v=${x.version}`} style={{ marginRight: 8 }}>{x.version}</a>)}</p> : null}
  </article></div>);
}
