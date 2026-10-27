import Link from "next/link";
import { requireCreator } from "@/server/auth";
import { albumsForCreator, creatorEarnings } from "@/server/queries";
import { access } from "@/server/onboarding";
import { listFor } from "@/server/participants";
import { Empty, I } from "@/components/ui";
import { euros } from "@/domain/rules";
import { AlbumAnswer, AddParticipant } from "./parts";

export default async function Studio() {
  const u = await requireCreator();
  const [a, albums, parts, earn] = await Promise.all([access(u.id), albumsForCreator(u.id), listFor(u.id), creatorEarnings(u.id)]);
  return (<div className="wrap">
    <div className="page-h"><div><h1 className="t-h1">Studio</h1><p className="muted" style={{ marginTop: 6 }}>Earnings, preview requests and the people who appear in your content.</p></div><Link href="/onboarding" className="btn btn-secondary">Creator setup</Link></div>
    <div className="pulse" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
      <div className="card"><span>This month</span><b className="num">{euros(earn.monthCents)}</b><span>paid out</span></div>
      <div className="card"><span>In progress</span><b className="num">{euros(earn.pendingCents)}</b><span>released after review and 24 hours</span></div>
      <div className="card"><span>Payouts</span><b>{a.caps.receivePayouts ? "Enabled" : "Not enabled"}</b><span>{a.caps.receivePayouts ? "every Friday, through the payment partner" : earn.heldCents ? `${euros(earn.heldCents)} waiting for payout setup` : "finish payout setup"}</span></div>
    </div>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Preview requests</h2></div>
      {albums.length ? <div className="card" style={{ padding: "4px 16px" }}><div className="list">{albums.map((x) => <AlbumAnswer key={x.a.id} id={x.a.id} buyer={x.buyer} kind={x.a.kind} canUpload={a.caps.upload} />)}</div></div>
        : <Empty icon="eye" title="No preview requests" text="Buyers who are choosing between offers can ask for a view once preview. You always decide." />}
    </section>

    <section className="sec" id="participants"><div className="sec-h"><h2 className="t-h2">People in your content</h2></div>
      <div className="card group">
        <p className="t-sm muted" style={{ paddingTop: 8 }}>Anyone else who is visible or audible must verify as an adult and consent to each delivery before it is shared. Add them here and send them their private link. They do not need an account.</p>
        {parts.map((p) => <div key={p.id} className="setrow"><div><b>{p.label}</b><span className="s">Added {p.createdAt.toISOString().slice(0, 10)}</span></div><span className={`status st-${p.identity}`}>{p.identity === "approved" ? "Verified" : p.identity === "pending" ? "Being reviewed" : p.identity === "not_started" ? "Not verified yet" : "Needs action"}</span></div>)}
        <AddParticipant />
      </div>
    </section>
  </div>);
}
