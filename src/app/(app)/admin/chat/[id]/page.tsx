import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin";
import { teamThread } from "@/server/teamchat";
import { euros } from "@/domain/rules";
import { I } from "@/components/ui";
import { TeamComposer } from "../../parts";

export const dynamic = "force-dynamic";

/* Staff chat as the team profile that posted the request. The creator sees a normal chat. */
export default async function TeamChat({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const th = await teamThread((await params).id);
  if (!th) notFound();
  const t = (d: Date) => d.toLocaleString("nl-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (<div className="wrap bo-page">
    <Link href={`/admin/users/${th.creator.id}`} className="back"><I n="left" c="sm" />{th.creator.handle}</Link>
    <div className="bo-h"><h1>{th.title}</h1><p>You write as <b>{th.buyer.handle}</b> (team profile) to <b>{th.creator.handle}</b> · {euros(th.d.dealCents)} · deal {th.d.status}. The creator sees a normal chat.</p></div>
    <div className="tc">
      <div className="tc-msgs">{th.msgs.map((m) => m.system ? <div key={m.id} className="tc-sys">{m.text}</div> : <div key={m.id} className={"tc-m" + (m.mine ? " mine" : "")}><span>{m.text}</span><time>{m.mine ? th.buyer.handle : th.creator.handle} · {t(m.at)}</time></div>)}
        {!th.msgs.length ? <p className="muted t-sm">No messages yet.</p> : null}</div>
      <TeamComposer dealId={th.d.id} as={th.buyer.handle} />
    </div>
  </div>);
}
