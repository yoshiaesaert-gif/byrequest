import { count, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import TestInbox from "./test-inbox";
import Link from "next/link";
import { overview } from "@/server/backoffice";
import { euros } from "@/domain/rules";
import { when } from "@/components/ui";
import { activity, type Metric } from "@/server/activity";
import { ActivityBoard, Feed } from "./activity";

const LABEL: Record<Metric, string> = { signups: "New accounts", active: "Active people", requests: "Requests posted", offers: "Offers sent", messages: "Messages sent", deals: "Deals started" };
const HINT: Record<Metric, string> = { signups: "external sign ups", active: "signed in and on the site", requests: "by external buyers", offers: "by external creators", messages: "chats and questions, never read", deals: "with an external side" };

const age = (d: Date | null) => { if (!d) return null; const h = (Date.now() - d.getTime()) / 3600_000; return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`; };

export default async function Overview({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const [o, a, [prob]] = await Promise.all([overview(), activity(), db.select({ n: count() }).from(schema.techIssues).where(inArray(schema.techIssues.status, ["open", "handling"]))]);
  const order: Metric[] = ["signups", "active", "requests", "offers", "messages", "deals"];
  const need = (await searchParams).need;
  const queues: [string, number, string, string?][] = [
    ["Technical problems reported", prob.n, "/admin/problems", "from the help chat"],
    ["Content to review", o.queues.review, "/admin/review", o.queues.oldestReview ? `oldest waits ${age(o.queues.oldestReview)}` : undefined],
    ["Open disputes", o.queues.disputes, "/admin/review"],
    ["Removal requests", o.queues.removals, "/admin/review"],
    ["Open appeals", o.queues.appeals, "/admin/users?kind=creators"],
    ["Creators waiting on the provider", o.queues.verifying, "/admin/users?kind=creators"],
    ["Creators with action required", o.queues.actionRequired, "/admin/users?kind=creators"],
    ["Restricted or suspended", o.queues.restricted, "/admin/users?kind=creators"],
  ];
  return (<div className="wrap bo-page">
    {need === "admin" ? <div className="banner"><div className="grow"><b>That action needs an admin.</b><div className="t-sm">Support can review and answer, admins can also block, restrict, reveal identity and manage the team.</div></div></div> : null}
    <div className="bo-h"><h1>Overview</h1><p>Live figures from this database. Money is a mirror of what the payment partner reports. ByRequest holds no funds.</p><div style={{ marginTop: 12 }}><TestInbox /></div></div>

    <section className="ax">
      <div className="ax-top"><div><span className="ax-eye"><i />External activity</span><h2>What real people do right now</h2><p>Only accounts outside the team: internal accounts and team profiles are left out. Compared up to the same time of day.</p></div>
        <div className="ax-people"><div><b className="num">{a.people.accounts}</b><span>external accounts</span></div><div><b className="num">{a.people.creators}</b><span>creators</span></div><div><b className="num">{a.people.buyers}</b><span>buyers</span></div></div></div>
      <div className="ax-main">
        <div className="ax-left"><ActivityBoard hour={a.hour} metrics={order.map((k) => ({ k, label: LABEL[k], hint: HINT[k], ...a.m[k], more: k === "offers" ? "/admin/offers" : k === "requests" ? "/admin/requests?tab=all&source=external" : k === "signups" ? "/admin/users" : undefined }))} /></div>
        <section className="dz-card ax-feed"><div className="dz-h"><h3>Latest from outside</h3><span>live</span></div><Feed items={a.feed} /></section>
      </div>
    </section>

    <h2 className="bo-sh" style={{ marginTop: 8 }}>Money <small className="bo-sh-n">real payments only</small></h2>
    {o.simulated.deals ? <p className="bo-sim">Payments are simulated until the payment partner is live, so no real money has moved yet. Left out of every figure below: {o.simulated.deals} test deals worth {euros(o.simulated.cents)} in simulated payments.</p> : null}
    <dl className="bo-kpis">
      <div><dt>Open requests</dt><dd className="num">{o.requests.open}</dd><span>{o.requests.week} new this week</span></div>
      <div><dt>Active deals</dt><dd className="num">{o.deals.active}</dd><span>{o.deals.week} started this week</span></div>
      <div><dt>Held by the partner now</dt><dd className="num">{euros(o.heldCents)}</dd><span>across active deals</span></div>
      <div><dt>Charged, 30 days</dt><dd className="num">{euros(o.money30.charged)}</dd><span>{o.deals.done30} deals completed</span></div>
      <div><dt>Platform revenue, 30 days</dt><dd className="num">{euros(o.money30.revenue)}</dd><span>{euros(o.money30.payouts)} paid to creators</span></div>
      <div><dt>Refunds, 30 days</dt><dd className="num">{euros(o.money30.refunds)}</dd><span>{o.money30.onHold ? `${euros(o.money30.onHold)} payouts on hold` : "no payouts on hold"}</span></div>
    </dl>

    <div className="bo-cols">
      <section><h2 className="bo-sh">Work waiting</h2>
        <div className="bo-list">{queues.map(([l, n, h, sub]) => (
          <Link key={l} href={h} className={"bo-row" + (n ? "" : " is-zero")}><span>{l}{sub ? <small>{sub}</small> : null}</span><b className="num">{n}</b></Link>))}</div>
      </section>
      <section><h2 className="bo-sh">Latest activity <Link href="/admin/audit">Full log</Link></h2>
        <div className="bo-list">{o.recent.map((r) => (
          <div key={r.id} className="bo-ev"><span><b>{r.action}</b>{r.subject ? <> · <Link href={`/admin/users/${r.subjectUserId}`}>{r.subject}</Link></> : null}<small>{r.by}</small></span><time>{when(r.at)}</time></div>))}
          {!o.recent.length ? <p className="muted t-sm">Nothing logged yet.</p> : null}</div>
      </section>
    </div>
  </div>);
}
