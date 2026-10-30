import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin";
import { teamThread } from "@/server/teamchat";
import { euros } from "@/domain/rules";
import { Av } from "@/components/ui";
import { ChatShell, SideCard } from "@/components/chat-shell";
import StaffChat from "../../staff-chat";
import { staffState } from "@/server/chat";
import { EMPTY_PANE } from "@/components/chat-pane";

export const dynamic = "force-dynamic";

/* Staff chat as the team profile that posted the request. The creator sees a normal chat. */
export default async function TeamChat({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireStaff();
  const id = (await params).id;
  const th = await teamThread(id);
  if (!th) notFound();
  const st = await staffState(user.id, "deal", id);
  return (<ChatShell back={`/admin/users/${th.creator.id}`} backLabel={th.creator.handle} eyebrow={`You write as ${th.buyer.handle}`} title={th.title} avatar={<Av a={th.creator.avatar} name={th.creator.handle} size={52} />}
    chat={<StaffChat kind="deal" id={th.d.id} creatorId={th.creator.id} creator={th.creator.handle} as={th.buyer.handle} avatar={<Av a={th.creator.avatar} name={th.creator.handle} size={40} />} initial={st && "msgs" in st ? st : EMPTY_PANE} />}
    side={<>
      <SideCard title="Deal">
        <div className="sh-person"><span className="cx-av"><Av a={th.creator.avatar} name={th.creator.handle} size={48} /></span><div><b>{th.creator.handle}</b><span>Deal {th.d.status} · {euros(th.d.dealCents)}</span></div></div>
        <div className="sh-btns"><Link href={`/admin/users/${th.creator.id}`} className="btn btn-secondary">View account</Link><Link href={`/c/${th.creator.handle}`} className="btn btn-secondary">View public profile</Link></div>
      </SideCard>
      <SideCard><div className="sh-links"><Link href={`/admin/requests/${th.d.requestId}`}>Open the request</Link></div></SideCard>
    </>} />);
}
