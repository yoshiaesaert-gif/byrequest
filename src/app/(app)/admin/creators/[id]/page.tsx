import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, creatorDetail } from "@/server/admin";
import { I } from "@/components/ui";
import { CreatorActions, AppealAnswer } from "../../parts";

export default async function CreatorAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const x = await creatorDetail(id);
  if (!x.u) notFound();
  const t = (d: Date | null | undefined) => (d ? d.toISOString().replace("T", " ").slice(0, 16) : "–");
  return (<div className="wrap adm">
    <Link href={`/admin/users/${id}`} className="back"><I n="left" c="sm" />Account</Link>
    <div className="page-h"><div><span className="eyebrow">Creator</span><h1 className="t-h1" style={{ marginTop: 6 }}>{x.u.handle}</h1><p className="muted t-sm">Status <b>{x.a.status}</b> · joined {t(x.u.createdAt)}{x.u.bannedAt ? ` · closed: ${x.u.banReason}` : ""}</p></div></div>
    <div className="grid">
      <div className="card"><h3 className="t-h3">Areas</h3><table><tbody>{Object.entries(x.a.areas).map(([k, v]) => <tr key={k}><td>{k}</td><td><b>{v}</b></td></tr>)}</tbody></table>
        <p className="t-sm" style={{ marginTop: 10 }}><b>Missing:</b> {x.a.missing.join("; ") || "nothing"}</p></div>
      <div className="card"><h3 className="t-h3">Actions</h3><CreatorActions userId={id} /></div>
      <div className="card"><h3 className="t-h3">Identity checks</h3><table><thead><tr><th>Provider</th><th>Ref</th><th>Status</th><th>18+</th><th>Updated</th></tr></thead><tbody>{x.checks.map((c) => <tr key={c.id}><td>{c.provider}<span className="envtag">{c.env}</span></td><td className="t-xs">{c.externalRef}</td><td>{c.status}{c.reason ? ` · ${c.reason}` : ""}</td><td>{c.over18 === null ? "–" : c.over18 ? "yes" : "no"}</td><td>{t(c.updatedAt)}</td></tr>)}</tbody></table></div>
      <div className="card"><h3 className="t-h3">Payout accounts</h3><table><thead><tr><th>Provider</th><th>Type</th><th>Status</th><th>Payouts</th><th>Sales</th><th>Missing</th></tr></thead><tbody>{x.payouts.map((p) => <tr key={p.id}><td>{p.provider}<span className="envtag">{p.env}</span></td><td>{p.accountType} · {p.country}</td><td>{p.status}</td><td>{p.canReceivePayouts ? "on" : "off"}</td><td>{p.canProcessSales ? "on" : "off"}</td><td className="t-xs">{p.missing.join(", ")}</td></tr>)}</tbody></table></div>
      <div className="card"><h3 className="t-h3">Agreements and consents</h3><table><thead><tr><th>Document</th><th>Version</th><th>Hash</th><th>Method</th><th>Accepted</th></tr></thead><tbody>{x.consents.map((c) => <tr key={c.id}><td>{c.kind}</td><td>{c.version}</td><td className="t-xs">{c.sha256.slice(0, 16)}…</td><td>{c.method}</td><td>{t(c.acceptedAt)}</td></tr>)}</tbody></table></div>
      <div className="card"><h3 className="t-h3">Participants</h3><table><thead><tr><th>Label</th><th>Identity</th><th>Consents</th></tr></thead><tbody>{x.parts.map((p) => <tr key={p.id}><td>{p.label}<div className="t-xs muted">{p.id}</div></td><td>{p.identity}</td><td className="t-xs">{x.partConsents.filter((c) => c.participantId === p.id).map((c) => `${c.deliveryId.slice(0, 8)}: ${c.withdrawnAt ? "withdrawn" : c.depicted && c.distribution ? "given" : "no"}`).join("; ") || "–"}</td></tr>)}</tbody></table></div>
      <div className="card"><h3 className="t-h3">Appeals</h3>{x.appeals.length ? x.appeals.map((a) => <div key={a.id} style={{ marginBottom: 12 }}><b>{a.area}</b> · {a.status}<p className="t-sm">{a.message}</p>{a.answer ? <p className="t-sm muted">Reply: {a.answer}</p> : <AppealAnswer id={a.id} />}</div>) : <p className="muted t-sm">None.</p>}</div>
      <div className="card"><h3 className="t-h3">Audit history</h3><table><tbody>{x.audit.map((e) => <tr key={e.id}><td className="t-xs">{t(e.at)}</td><td className="t-xs">{e.actor.split(":")[0]}</td><td><b className="t-xs">{e.action}</b><pre>{JSON.stringify(e.detail)}</pre></td></tr>)}</tbody></table></div>
    </div>
  </div>);
}
