import Link from "next/link";
import { notFound } from "next/navigation";
import { readdirSync } from "node:fs";
import { requireStaff } from "@/server/admin";
import { requestDetail } from "@/server/moderation";
import { CAT_LABEL, amountLabel, euros } from "@/domain/rules";
import { leftLabel, when } from "@/components/ui";
import { RemoveRequest } from "../../parts";
import { CheckResult, EditRequest, ReviewActions } from "../parts";

const COVERS = readdirSync("public/img").filter((f) => /^c\d+\.webp$/.test(f)).map((f) => f.replace(".webp", "")).sort();
const STATUS_LABEL: Record<string, string> = { in_review: "In review", open: "Live", matched: "Deal", closed: "Closed", expired: "Expired", rejected: "Rejected" };

/* One request: review it, edit every field, and see what happened to it. */
export default async function RequestAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireStaff();
  const { id } = await params;
  const x = await requestDetail(id);
  if (!x) notFound();
  const { r, buyer, offers, deal, history, reviewer } = x;
  return (<div className="wrap bo-page">
    <Link href="/admin/requests?tab=all" className="back">All requests</Link>
    <div className="bo-h"><h1>{r.title}</h1>
      <p><span className={"rq-st st-" + r.status}>{STATUS_LABEL[r.status]}</span> {CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)} · {euros(r.dealCents)} · posted {when(r.createdAt)}{r.status === "open" ? ` · ${leftLabel(r.closesAt)}` : ""}{r.staffEditedAt ? ` · edited by the team ${when(r.staffEditedAt)}` : ""}</p></div>
    <div className="rq-detail">
      <section>
        <h2 className="bo-sh">Edit</h2>
        <EditRequest r={r} covers={COVERS} locked={!!deal} canEdit={role === "admin"} />
      </section>
      <aside>
        {r.status === "in_review" ? <><h2 className="bo-sh">Decide</h2><ReviewActions id={r.id} suggestion={r.checkVerdict} flags={r.checkFlags} /></> : null}
        {r.status === "open" ? <><h2 className="bo-sh">Take offline</h2><RemoveRequest id={r.id} /></> : null}
        {r.reviewedAt ? <p className="t-sm muted" style={{ marginTop: 10 }}>{r.status === "rejected" ? "Rejected" : "Approved"} {when(r.reviewedAt)} by {reviewer ?? "the automatic check"}{r.reviewNote ? `: “${r.reviewNote}”` : ""}</p> : null}
        <h2 className="bo-sh">Automatic check</h2>
        <CheckResult verdict={r.checkVerdict} flags={r.checkFlags} id={r.id} />
        <h2 className="bo-sh">Buyer</h2>
        {buyer ? <div className="bo-ev"><span><Link href={`/admin/users/${buyer.id}`}><b>{buyer.handle}</b></Link>{buyer.house ? <span className="bo-tag">team</span> : null}<small>{buyer.buyerRatingCount ? `★ ${(buyer.buyerRatingSum / buyer.buyerRatingCount).toFixed(1)} from ${buyer.buyerRatingCount} creators` : "No ratings yet"} · {buyer.ageVerifiedAt ? "age confirmed" : "age not confirmed"} · member since {when(buyer.createdAt)}</small></span></div> : null}
        <h2 className="bo-sh">Offers ({offers.length})</h2>
        <div className="bo-list">{offers.map(({ o, handle }) => <div key={o.id} className="bo-ev"><span><b>{handle}</b><small>{o.status} · {o.showsFace ? "face" : "no face"} · vault {o.vault} · {o.etaHours}h{o.note ? ` · “${o.note}”` : ""}</small></span><time>{when(o.createdAt)}</time></div>)}
          {!offers.length ? <p className="t-sm muted">No offers.</p> : null}</div>
        {deal ? <><h2 className="bo-sh">Deal</h2><div className="bo-ev"><span><b>{deal.status}</b><small>{euros(deal.dealCents)} · since {when(deal.createdAt)}</small></span></div></> : null}
        <h2 className="bo-sh">History</h2>
        <div className="bo-list">{history.map(({ a, by }) => <div key={a.id} className="bo-ev"><span><b>{a.action.replace("staff.", "").replaceAll("_", " ")}</b><small>{by ?? a.actor}{a.detail.changes ? ` · ${Object.keys(a.detail.changes as object).join(", ")}` : ""}{a.detail.reason ? ` · “${a.detail.reason}”` : ""}{a.detail.note ? ` · “${a.detail.note}”` : ""}</small></span><time>{when(a.at)}</time></div>)}
          {!history.length ? <p className="t-sm muted">No team actions yet.</p> : null}</div>
        <p style={{ marginTop: 16 }}><Link href={`/requests/${r.id}`} className="btn btn-secondary btn-sm">View as creators see it</Link></p>
      </aside>
    </div>
  </div>);
}
