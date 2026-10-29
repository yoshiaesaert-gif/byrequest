import Link from "next/link";
import { requireStaff, creatorsOverview, reviewQueue } from "@/server/admin";
import { CAT_LABEL, amountLabel } from "@/domain/rules";
import { PROVIDER_ENV, PROVIDERS, REVIEW_MODE } from "@/config/compliance";
import { DeliveryReview, AlbumReview, DisputeDecide, RemovalHandle, ReportHandle, AppealAnswer } from "../parts";
import { db, schema } from "@/db";
import { eq, asc } from "drizzle-orm";
import { ACTION_LABEL } from "@/server/decisions";
import { openReports, REPORT_KINDS } from "@/server/reports";
import { when } from "@/components/ui";

export default async function Review() {
  const { role } = await requireStaff();
  const [creators, q, reps, appeals] = await Promise.all([creatorsOverview(), reviewQueue(), openReports(),
    db.select({ a: schema.appeals, handle: schema.users.handle, action: schema.decisions.action, facts: schema.decisions.facts }).from(schema.appeals)
      .innerJoin(schema.users, eq(schema.users.id, schema.appeals.userId)).leftJoin(schema.decisions, eq(schema.decisions.id, schema.appeals.decisionId))
      .where(eq(schema.appeals.status, "open")).orderBy(asc(schema.appeals.createdAt))]);
  return (<div className="wrap adm">
    <div className="page-h"><div><span className="eyebrow">Support · {role}</span><h1 className="t-h1" style={{ marginTop: 6 }}>Review queue</h1>
      <p className="muted t-sm" style={{ marginTop: 6 }}>Environment: <b>{PROVIDER_ENV}</b> · review mode: <b>{REVIEW_MODE}</b> · every view of a file and of confidential data is logged.</p></div></div>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Reports ({reps.length})</h2><span className="t-sm muted">Exploitation, trafficking and minors first. Pass suspected abuse to the police without delay.</span></div>
      {reps.map(({ r, by }) => <div key={r.id} className={"card rep p" + r.priority} style={{ marginBottom: 12 }}>
        <div className="rep-h"><b>{REPORT_KINDS[r.kind]}</b>{r.trustedFlagger ? <span className="bo-tag">trusted · {r.trustedFlagger}</span> : null}<span className="t-xs muted">{when(r.createdAt)} · {by ?? "no account"}{r.targetRef ? ` · ${r.targetType} ${r.targetRef.slice(0, 12)}` : ""} · {r.status}</span></div>
        <p className="t-sm" style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{r.details}</p><ReportHandle id={r.id} /></div>)}
      {!reps.length ? <p className="muted">No open reports.</p> : null}</section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Appeals ({appeals.length})</h2><span className="t-sm muted">Someone other than the first decision maker answers. Reverse the decision on the account page if they are right.</span></div>
      {appeals.map(({ a, handle, action, facts }) => <div key={a.id} className="card" style={{ marginBottom: 12 }}>
        <b>{handle} · {action ? ACTION_LABEL[action] ?? action : a.area}</b>{facts ? <div className="t-xs muted">Decision: {facts}</div> : null}
        <p className="t-sm" style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}>{a.message}</p><AppealAnswer id={a.id} /></div>)}
      {!appeals.length ? <p className="muted">No open appeals.</p> : null}</section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Content review ({q.dls.length + q.albums.length})</h2><span className="t-sm muted">A technical pass is not a content approval</span></div>
      <div className="grid">{q.dls.map((x) => (
        <div key={x.dl.id} className="card"><b>{x.title}</b><div className="t-sm muted">{CAT_LABEL[x.category]} · {amountLabel(x.category, x.amount)} · by {x.creator} · {x.dl.onlyCreator ? "only the creator appears" : `${x.dl.participantIds.length} other participant(s)`}</div>
          <div className="thumbs" style={{ margin: "12px 0" }}>{x.dl.mediaIds.map((m) => q.mimes[m]?.startsWith("image/") ? <a key={m} href={`/api/admin/media/${m}`} target="_blank"><img src={`/api/admin/media/${m}`} alt="" /></a> : q.mimes[m]?.startsWith("video/") ? <video key={m} src={`/api/admin/media/${m}`} controls preload="metadata" /> : <audio key={m} src={`/api/admin/media/${m}`} controls />)}</div>
          <div className="t-xs muted" style={{ marginBottom: 10 }}>{x.dl.technical.map((t) => (t.ok ? "✓ " : "✗ ") + t.text).join(" · ")}</div>
          {x.dl.review === "blocked_participants" ? <span className="status st-action_required">Reviewed, waiting for participant consent</span> : <DeliveryReview id={x.dl.id} />}</div>))}
        {q.albums.map((x) => (<div key={x.p.id} className="card"><b>Preview album photo · {x.p.kind}</b><div className="t-sm muted">by {x.creator} · shared only with buyers they choose, 10 seconds per photo</div>
          <div className="thumbs" style={{ margin: "12px 0" }}><img src={`/api/admin/media/${x.p.mediaId}`} alt="" /></div><AlbumReview id={x.p.id} /></div>))}
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
