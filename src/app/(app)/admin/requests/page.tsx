import Link from "next/link";
import { requireStaff } from "@/server/admin";
import { autoApprove, listRequests, reviewQueue, STATUSES } from "@/server/moderation";
import { CAT_LABEL, amountLabel, euros, type Category } from "@/domain/rules";
import { leftLabel, when } from "@/components/ui";
import { AutoApprove, BulkApprove, CheckResult, ReviewActions } from "./parts";

/* Requests: the review queue for new requests, and every request on the platform with full edit access. */
const TABS: [string, string][] = [["review", "To review"], ["all", "All requests"]];
const STATUS_LABEL: Record<string, string> = { in_review: "In review", open: "Live", matched: "Deal", closed: "Closed", expired: "Expired", rejected: "Rejected" };
const CATS = Object.keys(CAT_LABEL) as Category[];

export default async function Requests({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; status?: string; category?: string; source?: string; page?: string }> }) {
  const { role } = await requireStaff();
  const sp = await searchParams;
  const [queue, auto] = await Promise.all([reviewQueue(), autoApprove()]);
  const tab = sp.tab ?? (queue.length ? "review" : "all");
  const list = tab === "all" ? await listRequests({ q: sp.q, status: sp.status, category: sp.category, source: sp.source, page: Number(sp.page ?? 0) }) : null;
  const clean = queue.filter((x) => x.r.checkVerdict === "approve").map((x) => x.r.id);
  const qs = (o: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ tab: "all", q: sp.q, status: sp.status, category: sp.category, source: sp.source, ...o }).filter(([, v]) => v) as [string, string][]).toString();

  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Requests</h1><p>Every new request waits here until someone of the team approves it. The automatic check reads title and description in Dutch, English and French and gives a suggestion with its reasons. The decision is always yours. Admins can edit every request, also the ones already live.</p></div>
    <div className="bo-tabs">{TABS.map(([k, l]) => <Link key={k} href={`/admin/requests?tab=${k}`} className={k === tab ? "on" : ""}>{l}{k === "review" && queue.length ? ` (${queue.length})` : ""}</Link>)}</div>

    {tab === "review" ? (<section>
      <div className="rq-tools"><AutoApprove on={auto} canChange={role === "admin"} />{clean.length && role === "admin" ? <BulkApprove ids={clean} /> : null}</div>
      {queue.length ? <div className="rq-queue">{queue.map(({ r, buyer, house }) => (
        <article key={r.id} className={"rq-card v-" + (r.checkVerdict ?? "check")}>
          <div className="rq-main">
            <div className="rq-meta"><span>{CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)} · <b>{euros(r.dealCents)}</b></span><span>{r.who}, {r.ageMin} to {r.ageMax} · face {r.face.replace("_", " ")} · vault {r.minVault} · {r.lang.toUpperCase()}</span></div>
            <h3>{r.title}</h3>
            {r.details ? <p className="rq-details">{r.details}</p> : <p className="rq-details muted">No description.</p>}
            <div className="rq-by">by <Link href={`/admin/users/${r.buyerId}`}>{buyer}</Link>{house ? <span className="bo-tag">team</span> : null} · posted {when(r.createdAt)}</div>
          </div>
          <aside className="rq-side">
            <CheckResult verdict={r.checkVerdict} flags={r.checkFlags} id={r.id} />
            <ReviewActions id={r.id} suggestion={r.checkVerdict} flags={r.checkFlags} />
            <Link href={`/admin/requests/${r.id}`} className="rq-edit">Open and edit</Link>
          </aside>
        </article>))}</div>
        : <p className="bo-empty">Nothing waiting. New requests appear here the moment they are posted.</p>}
    </section>) : null}

    {list ? (<section>
      <form className="bo-search rq-filter" action="/admin/requests">
        <input type="hidden" name="tab" value="all" />
        <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Title, description or username" autoComplete="off" />
        <select className="input" name="status" defaultValue={sp.status ?? ""}><option value="">Every status</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]} ({list.byStatus[s] ?? 0})</option>)}</select>
        <select className="input" name="category" defaultValue={sp.category ?? ""}><option value="">Every type</option>{CATS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</select>
        <select className="input" name="source" defaultValue={sp.source ?? ""}><option value="">Everyone</option><option value="users">Users</option><option value="team">Team profiles</option></select>
        <button className="btn btn-primary">Filter</button>
      </form>
      <p className="t-sm muted" style={{ margin: "4px 0 10px" }}>{list.total} requests</p>
      <div className="bo-table"><table><thead><tr><th>Request</th><th>Buyer</th><th>Status</th><th>Type</th><th className="r">Budget</th><th className="r">Offers</th><th>Posted</th><th>Closes</th><th /></tr></thead>
        <tbody>{list.rows.map(({ r, buyer, house, offers }) => (
          <tr key={r.id}>
            <td className="bo-detail" style={{ color: "var(--ink)", maxWidth: 320 }}><Link href={`/admin/requests/${r.id}`}>{r.title}</Link>{r.staffEditedAt ? <span className="bo-tag">edited</span> : null}</td>
            <td>{buyer}{house ? <span className="bo-tag">team</span> : null}</td>
            <td><span className={"rq-st st-" + r.status}>{STATUS_LABEL[r.status]}</span></td>
            <td>{CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)}</td>
            <td className="r num">{euros(r.dealCents)}</td>
            <td className="r num">{offers}</td>
            <td>{when(r.createdAt)}</td>
            <td>{r.status === "open" ? leftLabel(r.closesAt) : ""}</td>
            <td><Link href={`/admin/requests/${r.id}`} className="btn btn-secondary btn-sm">Edit</Link></td>
          </tr>))}</tbody></table></div>
      <div className="rq-pages">{Number(sp.page ?? 0) > 0 ? <Link href={qs({ page: String(Number(sp.page) - 1) })}>Previous</Link> : <span />}{(Number(sp.page ?? 0) + 1) * 50 < list.total ? <Link href={qs({ page: String(Number(sp.page ?? 0) + 1) })}>Next</Link> : null}</div>
    </section>) : null}
  </div>);
}
