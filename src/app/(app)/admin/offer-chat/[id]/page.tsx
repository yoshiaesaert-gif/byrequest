import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/server/admin";
import { teamOfferThread } from "@/server/teamchat";
import { euros } from "@/domain/rules";
import { Av } from "@/components/ui";
import { ChatShell, SideCard } from "@/components/chat-shell";
import { HouseAccept } from "../../parts";
import StaffChat from "../../staff-chat";
import AlbumAsk from "../../../c/[handle]/album-ask";
import { db, schema } from "@/db";
import { asked, PREVIEW_LIMIT } from "@/server/albums";
import { staffState } from "@/server/chat";
import { EMPTY_PANE } from "@/components/chat-pane";

export const dynamic = "force-dynamic";

/* Talk with a candidate before choosing, as the team profile that posted the request: the same screen a buyer gets. */
export default async function OfferChat({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireStaff();
  const id = (await params).id;
  const th = await teamOfferThread(id);
  if (!th) notFound();
  const [st, album, n] = await Promise.all([staffState(user.id, "offer", id), db.query.previewAlbums.findFirst({ where: eq(schema.previewAlbums.offerId, th.o.id) }), asked(th.buyer.id, th.r.id)]);
  const left = Math.max(0, PREVIEW_LIMIT - n);
  const pending = th.o.status === "pending" && th.r.status === "open";
  return (<ChatShell back={`/admin/users/${th.creator.id}`} backLabel={th.creator.handle} eyebrow={`You write as ${th.buyer.handle}`} title={th.r.title} avatar={<Av a={th.creator.avatar} name={th.creator.handle} size={52} />}
    chat={<StaffChat kind="offer" id={th.o.id} creatorId={th.creator.id} creator={th.creator.handle} as={th.buyer.handle} avatar={<Av a={th.creator.avatar} name={th.creator.handle} size={40} />} initial={st && "msgs" in st ? st : EMPTY_PANE} />}
    side={<>
      <SideCard title="Their offer">
        <div className="sh-person"><span className="cx-av"><Av a={th.creator.avatar} name={th.creator.handle} size={48} /></span><div><b>{th.creator.handle}</b><span>Application {th.o.status} · {euros(th.r.dealCents)}</span></div></div>
        {th.o.note ? <p className="t-sm" style={{ margin: 0 }}>“{th.o.note}”</p> : null}
        <div className="tags"><span className="badge brand">{th.o.showsFace ? "Face shown" : "No face"}</span><span className="badge">Vault {th.o.vault}</span><span className="badge">Within {th.o.etaHours} h</span></div>
        <div className="sh-btns">
          {pending ? <HouseAccept id={th.o.id} /> : null}
          <Link href={`/admin/users/${th.creator.id}`} className="btn btn-secondary">View account</Link>
          <Link href={`/c/${th.creator.handle}`} className="btn btn-secondary">View public profile</Link>
        </div>
        {pending ? <p className="t-xs muted" style={{ margin: 0 }}>Choosing starts the deal and the payment, as {th.buyer.handle}.</p> : null}
      </SideCard>
      {pending ? <AlbumAsk offerId={th.o.id} handle={th.creator.handle} album={album ? { id: album.id, status: album.status } : null} left={left} /> : null}
      <SideCard title="Request"><p className="t-sm" style={{ margin: 0 }}>{th.r.title}</p><div className="sh-links"><Link href={`/admin/requests/${th.r.id}`}>Open and edit</Link></div></SideCard>
    </>} />);
}
