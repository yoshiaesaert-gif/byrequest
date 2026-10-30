import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin";
import { teamOfferThread } from "@/server/teamchat";
import { euros } from "@/domain/rules";
import { I, Av } from "@/components/ui";
import { HouseAccept } from "../../parts";
import StaffChat from "../../staff-chat";
import AlbumAsk from "../../../c/[handle]/album-ask";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { asked, PREVIEW_LIMIT } from "@/server/albums";
import { staffState } from "@/server/chat";

export const dynamic = "force-dynamic";

/* Talk with a candidate before choosing, as the team profile that posted the request. */
export default async function OfferChat({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireStaff();
  const th = await teamOfferThread((await params).id);
  if (!th) notFound();
  const st = await staffState(user.id, "offer", (await params).id);
  const album = await db.query.previewAlbums.findFirst({ where: eq(schema.previewAlbums.offerId, th.o.id) });
  const left = Math.max(0, PREVIEW_LIMIT - (await asked(th.buyer.id, th.r.id)));
  const initial = st && "msgs" in st ? st : { v: "", status: null, typing: false, otherKey: null, closed: false, msgs: [] };
  return (<div className="wrap bo-page">
    <Link href={`/admin/users/${th.creator.id}`} className="back"><I n="left" c="sm" />{th.creator.handle}</Link>
    <div className="bo-h"><h1>{th.r.title}</h1><p>You write as <b>{th.buyer.handle}</b> (team profile) to <b>{th.creator.handle}</b> about their application · {euros(th.r.dealCents)} · application {th.o.status}. They see it on the request, under their application, and get a notification.</p></div>
    <div className="tc">
      <div className="bo-app"><small>Their application: delivers within {th.o.etaHours} h · {th.o.showsFace ? "shows face" : "no face"} · vault {th.o.vault}</small>{th.o.note ? <p className="bo-app-note">“{th.o.note}”</p> : null}
        {th.o.status === "pending" && th.r.status === "open" ? <div className="bo-app-act"><HouseAccept id={th.o.id} /><span className="t-xs muted">Choose {th.creator.handle} as {th.buyer.handle}: the deal and the payment start.</span></div> : null}</div>
      <StaffChat kind="offer" id={th.o.id} creatorId={th.creator.id} creator={th.creator.handle} as={th.buyer.handle} avatar={<Av a={th.creator.avatar} name={th.creator.handle} size={40} />} initial={initial} actions={<AlbumAsk offerId={th.o.id} handle={th.creator.handle} album={album ? { id: album.id, status: album.status } : null} left={left} />} />
    </div>
  </div>);
}
