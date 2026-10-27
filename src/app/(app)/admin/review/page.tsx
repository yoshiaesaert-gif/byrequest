import Link from "next/link";
import { requireStaff, creatorsOverview, reviewQueue } from "@/server/admin";
import { CAT_LABEL, amountLabel } from "@/domain/rules";
import { PROVIDER_ENV, PROVIDERS, REVIEW_MODE } from "@/config/compliance";
import { DeliveryReview, AlbumReview, DisputeDecide, RemovalHandle } from "../parts";

export default async function Review() {
  const { role } = await requireStaff();
  const [creators, q] = await Promise.all([creatorsOverview(), reviewQueue()]);
  return (<div className="wrap adm">
    <div className="page-h"><div><span className="eyebrow">Support · {role}</span><h1 className="t-h1" style={{ marginTop: 6 }}>Review queue</h1>
      <p className="muted t-sm" style={{ marginTop: 6 }}>Environment: <b>{PROVIDER_ENV}</b> · review mode: <b>{REVIEW_MODE}</b> · every view of a file and of confidential data is logged.</p></div></div>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Content review ({q.dls.length + q.albums.length})</h2><span className="t-sm muted">A technical pass is not a content approval</span></div>
      <div className="grid">{q.dls.map((x) => (
        <div key={x.dl.id} className="card"><b>{x.title}</b><div className="t-sm muted">{CAT_LABEL[x.category]} · {amountLabel(x.category, x.amount)} · by {x.creator} · {x.dl.onlyCreator ? "only the creator appears" : `${x.dl.participantIds.length} other participant(s)`}</div>
          <div className="thumbs" style={{ margin: "12px 0" }}>{x.dl.mediaIds.map((m) => q.mimes[m]?.startsWith("image/") ? <a key={m} href={`/api/admin/media/${m}`} target="_blank"><img src={`/api/admin/media/${m}`} alt="" /></a> : q.mimes[m]?.startsWith("video/") ? <video key={m} src={`/api/admin/media/${m}`} controls preload="metadata" /> : <audio key={m} src={`/api/admin/media/${m}`} controls />)}</div>
          <div className="t-xs muted" style={{ marginBottom: 10 }}>{x.dl.technical.map((t) => (t.ok ? "✓ " : "✗ ") + t.text).join(" · ")}</div>
          {x.dl.review === "blocked_participants" ? <span className="status st-action_required">Reviewed, waiting for participant consent</span> : <DeliveryReview id={x.dl.id} />}</div>))}
        {q.albums.map((x) => (<div key={x.a.id} className="card"><b>Preview album · {x.a.kind}</b><div className="t-sm muted">by {x.creator}</div>
          <div className="thumbs" style={{ margin: "12px 0" }}>{x.a.mediaIds.map((m) => <img key={m} src={`/api/admin/media/${m}`} alt="" />)}</div><AlbumReview id={x.a.id} /></div>))}
        {!q.dls.length && !q.albums.length ? <p className="muted">Nothing waiting.</p> : null}</div>
    </section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Disputes ({q.disputes.length})</h2></div>
      {q.disputes.map((x) => <div key={x.dp.id} className="card" style={{ marginBottom: 12 }}><b>{x.title}</b><div className="t-sm muted">{x.dp.reason}{x.dp.note ? ` · “${x.dp.note}”` : ""}</div><DisputeDecide id={x.dp.id} /></div>)}
      {!q.disputes.length ? <p className="muted">No open disputes.</p> : null}</section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Removal requests ({q.removals.length})</h2></div>
      {q.removals.map((r) => <div key={r.id} className="card" style={{ marginBottom: 12 }}><b>{r.reference || "No reference given"}</b><p className="t-sm">{r.description}</p><RemovalHandle id={r.id} /></div>)}
      {!q.removals.length ? <p className="muted">None open.</p> : null}</section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Creators</h2></div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}><table><thead><tr><th>Creator</th><th>Status</th><th>Email</th><th>Identity</th><th>Payouts</th><th>Agreement</th><th>Restriction</th><th>Missing</th></tr></thead>
        <tbody>{creators.map((c) => (<tr key={c.o.userId}>
          <td><Link href={`/admin/creators/${c.o.userId}`} style={{ fontWeight: 600 }}>{c.handle}</Link></td><td><span className={`status st-${c.access.status === "active" ? "approved" : c.access.status === "pending_verification" ? "pending" : c.access.status === "draft" ? "not_started" : "action_required"}`}>{c.access.status}</span></td>
          <td>{c.access.areas.email}</td><td>{c.access.areas.identity}</td><td>{c.access.areas.payout}{c.access.payout?.env === "test" ? <span className="envtag">test</span> : null}</td><td>{c.access.areas.agreement}</td><td>{c.access.areas.restriction}</td><td className="t-xs">{c.access.missing.join("; ")}</td></tr>))}</tbody></table></div>
    </section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Providers</h2></div>
      <div className="card" style={{ padding: 0 }}><table><thead><tr><th>Provider</th><th>Roles</th><th>Env</th><th>Status</th><th>Note</th></tr></thead><tbody>{Object.values(PROVIDERS).map((p) => <tr key={p.id}><td>{p.label}</td><td>{p.roles.join(", ")}</td><td>{p.env}</td><td>{p.status}</td><td className="t-xs">{p.note}</td></tr>)}</tbody></table></div>
    </section>
  </div>);
}
