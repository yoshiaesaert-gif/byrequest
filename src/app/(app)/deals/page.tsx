import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import { myDeals, myOffers, myRequests } from "@/server/queries";
import { Cover, Empty, I, leftLabel } from "@/components/ui";
import { CAT_LABEL, amountLabel, euros } from "@/domain/rules";

const LABEL: Record<string, [string, string]> = {
  held: ["In progress", "brand"], reviewing: ["Being reviewed", "brand"], delivered: ["In vault · 24h to object", "amber"],
  disputed: ["Under review", "amber"], released: ["Done", "ok"], refunded: ["Refunded", ""],
};

export default async function Deals() {
  const u = await requireUser();
  const sell = u.isCreator && (await cookies()).get("brq_mode")?.value === "sell";
  const [deals, reqs, offers] = await Promise.all([myDeals(u.id), sell ? [] : myRequests(u.id), sell ? myOffers(u.id) : []]);
  const mine = deals.filter((d) => (sell ? d.d.creatorId === u.id : d.d.buyerId === u.id));
  const open = reqs.filter((r) => r.r.status === "open");
  const pending = offers.filter((o) => o.o.status === "pending");
  return (<div className="wrap">
    <div className="page-h"><div><h1 className="t-h1">{sell ? "Offers and deals" : "Deals"}</h1><p className="muted" style={{ marginTop: 6 }}>{sell ? "Your open offers and the deals you are working on." : "Your requests, offers and deliveries in one place."}</p></div>
      {sell ? <Link href="/for-you" className="btn btn-primary"><I n="foryou" c="sm" />Find requests</Link> : <Link href="/post" className="btn btn-primary"><I n="plus" c="sm" />New request</Link>}</div>

    {!sell && open.length ? <section className="sec"><div className="sec-h"><h2 className="t-h2">Open requests</h2></div>
      <div className="card dlist" style={{ padding: "4px 16px" }}><div className="list">{open.map(({ r, offers: n }) => (
        <Link key={r.id} href={`/requests/${r.id}/offers`} className="lrow"><div className="media"><Cover cover={r.cover} /></div><div style={{ minWidth: 0 }}><b>{r.title}</b><div className="t-sm muted">{CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)} · closes in {leftLabel(r.closesAt).replace(" left", "")}</div></div>
          <span className={"badge " + (n ? "ok" : "")}>{n ? `${n} offers` : "Waiting"}</span></Link>))}</div></div></section> : null}

    {sell && pending.length ? <section className="sec"><div className="sec-h"><h2 className="t-h2">Waiting for the buyer</h2></div>
      <div className="card dlist" style={{ padding: "4px 16px" }}><div className="list">{pending.map(({ o, r }) => (
        <Link key={o.id} href={`/requests/${r.id}`} className="lrow"><div className="media"><Cover cover={r.cover} /></div><div style={{ minWidth: 0 }}><b>{r.title}</b><div className="t-sm muted">{o.showsFace ? "Face shown" : "No face"} · closes in {leftLabel(r.closesAt).replace(" left", "")}</div></div><span className="badge">Offer sent</span></Link>))}</div></div></section> : null}

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Deals</h2></div>
      {mine.length ? <div className="card dlist" style={{ padding: "4px 16px" }}><div className="list">{mine.map(({ d, r }) => (
        <Link key={d.id} href={`/deals/${d.id}`} className="lrow"><div className="media"><Cover cover={r.cover} /></div><div style={{ minWidth: 0 }}><b>{r.title}</b><div className="t-sm muted">{CAT_LABEL[r.category]} · {euros(sell ? d.creatorCents : d.dealCents)}{sell ? " for you" : ""}</div></div>
          <span className={"badge " + LABEL[d.status][1]}>{LABEL[d.status][0]}</span></Link>))}</div></div>
        : <Empty icon="deals" title="No deals yet" text={sell ? "Make an offer on a request. When a buyer picks you, the deal appears here." : "Accept an offer on one of your requests to start a deal."} />}
    </section>
  </div>);
}
