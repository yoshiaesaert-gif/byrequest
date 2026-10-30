import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { getT } from "@/i18n/server";
import { Av } from "@/components/ui";
import { ChatShell, SideCard, SideSkeleton } from "@/components/chat-shell";
import { BlockButton } from "@/components/block-button";
import { asked, PREVIEW_LIMIT } from "@/server/albums";
import { VAULT_LABEL } from "@/domain/rules";
import AlbumAsk from "../../../../c/[handle]/album-ask";
import OfferChat from "./chat";

export const dynamic = "force-dynamic";

/* The buyer's conversation with one candidate: the chat on the left, choosing, the preview album and the profile on the right. */
export default async function CandidatePage({ params, searchParams }: { params: Promise<{ id: string; offerId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id, offerId } = await params;
  const [u, { t }, sp] = await Promise.all([requireUser(), getT(), searchParams]);
  const [r, o] = await Promise.all([db.query.requests.findFirst({ where: eq(schema.requests.id, id), columns: { id: true, buyerId: true, title: true } }), db.query.offers.findFirst({ where: and(eq(schema.offers.id, offerId), eq(schema.offers.requestId, id)) })]);
  if (!r || r.buyerId !== u.id || !o) notFound();
  const c = await db.query.users.findFirst({ where: eq(schema.users.id, o.creatorId), columns: { id: true, handle: true, avatar: true, ratingSum: true, ratingCount: true } });
  if (!c) notFound();
  return (<ChatShell back={sp.from === "inbox" ? "/inbox" : `/requests/${id}/offers`} backLabel={sp.from === "inbox" ? t("Inbox") : t("Offers")} eyebrow={t("Candidate")} title={c.handle} avatar={<Av a={c.avatar} name={c.handle} size={52} />}
    chat={<OfferChat offerId={offerId} meId={u.id} name={c.handle} avatar={<Av a={c.avatar} name={c.handle} size={40} />} fromInbox={sp.from === "inbox"} />}
    side={<Suspense fallback={<><SideSkeleton /><SideSkeleton /></>}><CandidateSide requestId={id} offerId={offerId} userId={u.id} /></Suspense>} />);
}

async function CandidateSide({ requestId, offerId, userId }: { requestId: string; offerId: string; userId: string }) {
  const { t } = await getT();
  const o = await db.query.offers.findFirst({ where: eq(schema.offers.id, offerId) });
  if (!o) return null;
  const [c, album, left] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, o.creatorId), columns: { handle: true, avatar: true, ratingSum: true, ratingCount: true } }),
    db.query.previewAlbums.findFirst({ where: and(eq(schema.previewAlbums.offerId, offerId), eq(schema.previewAlbums.buyerId, userId)) }),
    asked(userId, requestId).then((n) => Math.max(0, PREVIEW_LIMIT - n)),
  ]);
  if (!c) return null;
  const pending = o.status === "pending";
  return (<>
    <SideCard title={t("Their offer")}>
      <div className="sh-person"><span className="cx-av"><Av a={c.avatar} name={c.handle} size={48} /></span><div><b>{c.handle}</b><span>{c.ratingCount ? `★ ${(c.ratingSum / c.ratingCount).toFixed(1)} · ${t("{n} ratings", { n: c.ratingCount })}` : t("New")}</span></div></div>
      {o.note ? <p className="t-sm" style={{ margin: 0 }}>“{o.note}”</p> : null}
      <div className="tags"><span className="badge brand">{o.showsFace ? t("Face shown") : t("No face")}</span><span className="badge">{t("Vault")} {t(VAULT_LABEL[o.vault])}</span><span className="badge">{o.etaHours < 72 ? t("Within {n} hours", { n: o.etaHours }) : t("Within {n} days", { n: Math.round(o.etaHours / 24) })}</span></div>
      <div className="sh-btns">
        {pending ? <Link href={`/requests/${requestId}/offers?pick=${offerId}`} className="btn btn-brand btn-lg">{t("Choose {name}", { name: c.handle })}</Link> : null}
        <Link href={`/c/${c.handle}`} className="btn btn-secondary">{t("View profile")}</Link>
      </div>
    </SideCard>
    {pending ? <AlbumAsk offerId={offerId} handle={c.handle} album={album ? { id: album.id, status: album.status } : null} left={left} /> : null}
    <SideCard><div className="sh-links"><Link href={`/report?type=profile&ref=${encodeURIComponent(c.handle)}`}>{t("Report")}</Link><BlockButton handle={c.handle} after={`/requests/${requestId}/offers`} /></div></SideCard>
  </>);
}
