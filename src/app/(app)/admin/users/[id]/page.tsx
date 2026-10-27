import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin";
import { userDetail } from "@/server/backoffice";
import { Av, I, when } from "@/components/ui";
import { euros } from "@/domain/rules";
import { BlockAccount } from "../../parts";

export default async function Account({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireStaff();
  const x = await userDetail(id);
  if (!x) notFound();
  const { u } = x;
  const spent = x.deals.filter((d) => d.d.buyerId === u.id && d.d.status !== "refunded").reduce((s, d) => s + d.d.dealCents + d.d.feeCents, 0);
  const earned = x.deals.filter((d) => d.d.creatorId === u.id && d.d.status === "released").reduce((s, d) => s + d.d.creatorCents, 0);
  return (<div className="wrap bo-page">
    <Link href="/admin/users" className="back"><I n="left" c="sm" />Accounts</Link>
    <div className="bo-acc-h"><Av a={u.avatar} name={u.handle} size={64} square /><div>
      <h1>{u.handle}{x.staff ? <span className="bo-tag">{x.staff}</span> : null}</h1>
      <p>{u.isCreator ? "Creator" : "Buyer"} · joined {when(u.createdAt)} · {role === "admin" ? u.email : "email visible to admins"}{u.marketingOptIn ? " · marketing opt in" : ""}</p>
      {u.bannedAt ? <p className="bo-warn">Blocked since {when(u.bannedAt)}{u.banReason ? `: ${u.banReason}` : ""}</p> : null}
    </div></div>

    <dl className="bo-kpis bo-kpis-4">
      <div><dt>Requests posted</dt><dd className="num">{x.reqs.length}</dd></div>
      <div><dt>Spent</dt><dd className="num">{euros(spent)}</dd></div>
      <div><dt>Offers made</dt><dd className="num">{x.offers}</dd></div>
      <div><dt>Earned</dt><dd className="num">{euros(earned)}</dd></div>
    </dl>

    <div className="bo-cols">
      <section>
        <h2 className="bo-sh">Deals</h2>
        <div className="bo-list">{x.deals.map(({ d, title }) => (
          <div key={d.id} className="bo-ev"><span><b>{title}</b><small>{d.buyerId === u.id ? "as buyer" : "as creator"} · {d.status} · {euros(d.dealCents)}</small></span><time>{when(d.createdAt)}</time></div>))}
          {!x.deals.length ? <p className="muted t-sm">No deals.</p> : null}</div>
        <h2 className="bo-sh">Requests</h2>
        <div className="bo-list">{x.reqs.map((r) => (
          <div key={r.id} className="bo-ev"><span><b>{r.title}</b><small>{r.status} · {euros(r.dealCents)}</small></span><time>{when(r.createdAt)}</time></div>))}
          {!x.reqs.length ? <p className="muted t-sm">No requests.</p> : null}</div>
      </section>
      <section>
        {u.isCreator ? <><h2 className="bo-sh">Creator setup</h2>
          <p className="t-sm muted" style={{ marginBottom: 10 }}>Identity {x.onboarding?.identity ?? "not started"} · payouts {x.onboarding?.payout ?? "not started"} · restriction {x.onboarding?.restriction ?? "none"}</p>
          <Link href={`/admin/creators/${u.id}`} className="btn btn-secondary btn-sm">Open creator file</Link></> : null}
        <h2 className="bo-sh">Account</h2>
        {role === "admin" ? <BlockAccount id={u.id} blocked={!!u.bannedAt} /> : <p className="t-sm muted">Blocking an account needs an admin.</p>}
        <h2 className="bo-sh">History <Link href={`/admin/audit?q=${encodeURIComponent(u.handle)}`}>In the log</Link></h2>
        <div className="bo-list">{x.history.map((r) => (
          <div key={r.id} className="bo-ev"><span><b>{r.action}</b><small>{r.by}</small></span><time>{when(r.at)}</time></div>))}
          {!x.history.length ? <p className="muted t-sm">Nothing logged for this account.</p> : null}</div>
      </section>
    </div>
  </div>);
}
