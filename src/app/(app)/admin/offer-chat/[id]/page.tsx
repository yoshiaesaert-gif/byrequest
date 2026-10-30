import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin";
import { teamOfferThread } from "@/server/teamchat";
import { euros } from "@/domain/rules";
import { I, Ticks } from "@/components/ui";
import { HouseAccept, TeamComposer } from "../../parts";

export const dynamic = "force-dynamic";

/* Talk with a candidate before choosing, as the team profile that posted the request. */
export default async function OfferChat({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const th = await teamOfferThread((await params).id);
  if (!th) notFound();
  const t = (d: Date) => d.toLocaleString("nl-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (<div className="wrap bo-page">
    <Link href={`/admin/users/${th.creator.id}`} className="back"><I n="left" c="sm" />{th.creator.handle}</Link>
    <div className="bo-h"><h1>{th.r.title}</h1><p>You write as <b>{th.buyer.handle}</b> (team profile) to <b>{th.creator.handle}</b> about their application · {euros(th.r.dealCents)} · application {th.o.status}. They see it on the request, under their application, and get a notification.</p></div>
    <div className="tc">
      <div className="bo-app"><small>Their application: delivers within {th.o.etaHours} h · {th.o.showsFace ? "shows face" : "no face"} · vault {th.o.vault}</small>{th.o.note ? <p className="bo-app-note">“{th.o.note}”</p> : null}
        {th.o.status === "pending" && th.r.status === "open" ? <div className="bo-app-act"><HouseAccept id={th.o.id} /><span className="t-xs muted">Choose {th.creator.handle} as {th.buyer.handle}: the deal and the payment start.</span></div> : null}</div>
      <div className="tc-msgs">{th.msgs.map((m) => <div key={m.id} className={"tc-m" + (m.mine ? " mine" : "")}><span>{m.text}</span><time>{m.mine ? th.buyer.handle : th.creator.handle} · {t(m.at)}{m.mine ? <Ticks read={m.read} /> : null}</time></div>)}
        {!th.msgs.length ? <p className="muted t-sm">No messages yet. Write the first one: {th.creator.handle} can answer right away.</p> : null}</div>
      <TeamComposer offerId={th.o.id} as={th.buyer.handle} />
    </div>
  </div>);
}
