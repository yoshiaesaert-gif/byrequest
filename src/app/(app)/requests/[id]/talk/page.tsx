import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { getT } from "@/i18n/server";
import { request } from "@/server/queries";
import { Av } from "@/components/ui";
import { ChatShell, SideCard } from "@/components/chat-shell";
import { euros } from "@/domain/rules";
import OfferChat from "../offers/[offerId]/chat";

export const dynamic = "force-dynamic";

/* The creator's conversation with the buyer about an application: the chat on the left, what to do next on the right. */
export default async function TalkPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const [u, { t }, sp] = await Promise.all([requireUser(), getT(), searchParams]);
  const [r, mine] = await Promise.all([request(id), db.query.offers.findFirst({ where: and(eq(schema.offers.requestId, id), eq(schema.offers.creatorId, u.id)) })]);
  if (!r || !mine) notFound();
  const [asked, buyer] = await Promise.all([
    db.query.previewAlbums.findFirst({ where: and(eq(schema.previewAlbums.offerId, mine.id), eq(schema.previewAlbums.status, "requested")), columns: { id: true } }),
    db.query.users.findFirst({ where: eq(schema.users.id, r.buyerId), columns: { handle: true } }),
  ]);
  const name = buyer?.handle ?? r.buyerHandle;
  return (<ChatShell back={sp.from === "inbox" ? "/inbox" : `/requests/${id}`} backLabel={sp.from === "inbox" ? t("Inbox") : t("Request")} eyebrow={t("Questions from the buyer")} title={r.title} avatar={<Av a={r.buyerAvatar} name={name} size={52} />}
    chat={<OfferChat offerId={mine.id} meId={u.id} name={name} avatar={<Av a={r.buyerAvatar} name={name} size={40} />} fromInbox={sp.from === "inbox"} e2e={!r.buyerHouse} />}
    side={<>
      {asked ? <SideCard tone="violet" title={t("Preview asked")}><p className="t-sm" style={{ margin: 0 }}>{t("{name} asked for a preview: share photos", { name })}</p><div className="sh-btns"><Link href="/studio#previews" className="btn btn-primary">{t("Share photos")}</Link></div></SideCard> : null}
      <SideCard title={t("Your application")}>
        <div className="sh-person"><span className="cx-av"><Av a={r.buyerAvatar} name={name} size={48} /></span><div><b>{name}</b><span>{t("Buyer")}</span></div></div>
        <p className="t-sm" style={{ margin: 0 }}>{t("Budget")}: <b>{euros(r.dealCents)}</b> · {t("Status")}: {t(mine.status === "pending" ? "Waiting" : mine.status === "accepted" ? "Chosen" : "Not chosen")}</p>
        <div className="sh-btns"><Link href={`/requests/${id}`} className="btn btn-secondary">{t("View request")}</Link></div>
      </SideCard>
      <SideCard><div className="sh-links"><Link href={`/report?type=profile&ref=${encodeURIComponent(name)}`}>{t("Report")}</Link></div></SideCard>
    </>} />);
}
