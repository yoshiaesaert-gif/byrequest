import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin";
import { teamThread } from "@/server/teamchat";
import { euros } from "@/domain/rules";
import { I, Av } from "@/components/ui";
import StaffChat from "../../staff-chat";
import { staffState } from "@/server/chat";

export const dynamic = "force-dynamic";

/* Staff chat as the team profile that posted the request. The creator sees a normal chat. */
export default async function TeamChat({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireStaff();
  const th = await teamThread((await params).id);
  if (!th) notFound();
  const st = await staffState(user.id, "deal", (await params).id);
  const initial = st && "msgs" in st ? st : { v: "", status: null, typing: false, otherKey: null, closed: false, msgs: [] };
  return (<div className="wrap bo-page">
    <Link href={`/admin/users/${th.creator.id}`} className="back"><I n="left" c="sm" />{th.creator.handle}</Link>
    <div className="bo-h"><h1>{th.title}</h1><p>You write as <b>{th.buyer.handle}</b> (team profile) to <b>{th.creator.handle}</b> · {euros(th.d.dealCents)} · deal {th.d.status}. The creator sees a normal chat.</p></div>
    <div className="tc">
      <StaffChat kind="deal" id={th.d.id} creatorId={th.creator.id} creator={th.creator.handle} as={th.buyer.handle} avatar={<Av a={th.creator.avatar} name={th.creator.handle} size={40} />} initial={initial} />
    </div>
  </div>);
}
