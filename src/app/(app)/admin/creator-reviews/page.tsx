import { requireStaff } from "@/server/admin";
import { reviewsForStaff } from "@/server/creatorreviews";
import { Decide } from "./decide";

export const dynamic = "force-dynamic";

/* Reviews from creators who were paid. Approved ones that may be published appear on the creator page. */
export default async function CreatorReviews() {
  await requireStaff();
  const rows = await reviewsForStaff();
  const avg = rows.length ? rows.reduce((a, r) => a + r.r.stars, 0) / rows.length : 0;
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Creator reviews</h1><p>Only creators with a paid deal can leave one. When they allow it, the review appears on the creator page right away with their username; hide anything that should not be there. Average so far: <b>{rows.length ? avg.toFixed(1) : "–"}</b> from {rows.length}.</p></div>
    {rows.length ? <div className="pl-table">{rows.map(({ r, handle }) => (
      <div key={r.id} className="cv-row">
        <span className="cv-st">{"★".repeat(r.stars)}<i>{"★".repeat(5 - r.stars)}</i></span>
        <span className="cv-q"><b>{handle}</b>{r.quote ? `“${r.quote}”` : <em>No text</em>}<small>{r.mayPublish ? "May be published" : "Private, do not publish"} · {r.createdAt.toISOString().slice(0, 10)}</small></span>
        <span className={"pr-st s-" + (r.status === "approved" ? "done" : r.status === "hidden" ? "open" : "handling")}>{r.status === "hidden" ? "Hidden" : r.mayPublish && r.quote.length >= 10 ? "On the page" : "Private"}</span>
        <Decide id={r.id} status={r.status} canPublish={r.mayPublish && r.quote.length >= 10} />
      </div>))}</div> : <p className="pl-empty">No creator reviews yet. They are asked on the Earnings page after a first paid deal.</p>}
  </div>);
}
