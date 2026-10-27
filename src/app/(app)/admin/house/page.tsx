import { requireStaff } from "@/server/admin";
import { houseBudget, houseOverview } from "@/server/house";
import { euros, CAT_LABEL, amountLabel, VAULT_LABEL } from "@/domain/rules";
import { leftLabel, when } from "@/components/ui";
import { HouseAccept, HouseRate, HouseBudget } from "../parts";

/* Internal requests: posted by the ByRequest team profiles, labelled "by ByRequest" on the site. */
export default async function House() {
  const { role } = await requireStaff();
  const [b, rows] = await Promise.all([houseBudget(), houseOverview()]);
  const open = rows.filter((x) => x.r.status === "open").length;
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Internal requests</h1><p>Requests by the ByRequest team profiles. On the site they carry <b>by ByRequest</b> under the request, with a link that explains them. The budget is real: accept offers that fit, rate after the deal is finished. Reviews exist only for finished deals.</p></div>
    <dl className="bo-kpis bo-kpis-4">
      <div><dt>Budget</dt><dd className="num">{euros(b.budget)}</dd></div>
      <div><dt>Committed</dt><dd className="num">{euros(b.spent)}</dd><span>accepted and paid deals</span></div>
      <div><dt>Left</dt><dd className="num">{euros(b.left)}</dd></div>
      <div><dt>Open requests</dt><dd className="num">{open}</dd><span>of {rows.length} team requests</span></div>
    </dl>
    {role === "admin" ? <section style={{ marginBottom: 24 }}><h2 className="bo-sh">Change the budget</h2><HouseBudget euros={Math.round(b.budget / 100)} /></section> : null}
    <section><h2 className="bo-sh">Requests</h2>
      <div className="bo-list">{rows.map(({ r, handle, offers, deal }) => (
        <div key={r.id} className="hr-row">
          <div className="hr-h"><b>{r.title}</b><span className="bo-tag">{r.lang}</span><span className="t-sm muted">{handle} · {CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)} · {euros(r.dealCents)} · {r.status === "open" ? leftLabel(r.closesAt) : r.status}</span></div>
          {deal ? <div className="hr-deal"><span>Deal with <b>{deal.creator}</b> · {deal.d.status} · since {when(deal.d.createdAt)}{deal.d.buyerRating ? ` · rated ${deal.d.buyerRating}★` : ""}</span>{deal.d.status === "released" && !deal.d.buyerRating ? <HouseRate id={deal.d.id} /> : null}</div>
            : offers.length ? offers.map(({ o, handle: c, ratingSum, ratingCount }) => (
              <div key={o.id} className="hr-offer"><span><b>{c}</b>{ratingCount ? ` · ${(ratingSum / ratingCount).toFixed(1)}★` : " · new"} · {o.showsFace ? "face shown" : "no face"} · vault {VAULT_LABEL[o.vault]} · within {o.etaHours}h{o.note ? ` · “${o.note}”` : ""}</span>{o.status === "pending" && r.status === "open" ? <HouseAccept id={o.id} /> : <span className="t-xs muted">{o.status}</span>}</div>))
            : <p className="t-sm muted">No offers yet.</p>}
        </div>))}</div></section>
  </div>);
}
