import Link from "next/link";
import { inCircle } from "@/server/circle";
import { CircleButton } from "../../c/[handle]/circle-button";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { ChatShell, SideCard, SideSkeleton } from "@/components/chat-shell";
import DealChat from "./chat";
import { BlockButton, UnblockButton } from "@/components/block-button";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { deal } from "@/server/queries";
import { access } from "@/server/onboarding";
import { listFor } from "@/server/participants";
import { Av, Cover, I, when } from "@/components/ui";
import { CAT_LABEL, VAULT_LABEL, amountLabel, euros } from "@/domain/rules";
import Room from "./room";
import { TIP_DAYS } from "@/server/deals";
import { blockedEither, iBlocked } from "@/server/blocks";
import { getT } from "@/i18n/server";
import { textsIn } from "@/server/translate";

type Search = Promise<{ accepted?: string; from?: string }>;

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  const { id } = await params;
  const [u, { t, locale }, sp] = await Promise.all([requireUser(), getT(), searchParams]);
  const x = await deal(id, u.id);
  if (!x) notFound();
  const buyer = x.d.buyerId === u.id;
  const other = buyer ? x.creator : x.buyer;
  const [L, blocked] = await Promise.all([textsIn([x.r.title], locale), blockedEither(u.id, other.id).then(async (b) => (b ? ((await iBlocked(u.id, other.id)) ? "me" as const : "them" as const) : null))]);
  const closed = blocked ? <div className="chat-closed" role="status"><I n="block" c="sm" /><div><b>{t("This chat is closed")}</b><span>{blocked === "me" ? t("You blocked {name}. The deal stays protected: delivery, review and refund work as usual.", { name: other.handle }) : t("New messages are not possible. The deal stays protected: delivery, review and refund work as usual.")}</span></div>{blocked === "me" ? <UnblockButton handle={other.handle} /> : null}</div> : undefined;
  const avatar = <Av a={other.avatar} name={other.handle} size={52} />;
  return (<>
    {sp.accepted ? <div className="wrap" style={{ paddingBottom: 0 }}><div className="banner ok"><I n="check" /><div className="grow"><b>{t("Payment secured.")}</b><div className="t-sm">{t("{amount} is held by the payment partner until delivery. It shows as BRQ DIGITAL.", { amount: euros(x.d.dealCents + x.d.feeCents + x.d.vatCents) })}</div></div></div></div> : null}
    <ChatShell back={sp.from === "inbox" ? "/inbox" : "/deals"} backLabel={sp.from === "inbox" ? t("Inbox") : buyer ? t("Deals") : t("Applications")} eyebrow={t("Deal with {name}", { name: other.handle })} title={L(x.r.title)} avatar={avatar}
      chat={<DealChat dealId={id} meId={u.id} name={other.handle} avatar={<Av a={other.avatar} name={other.handle} size={40} />} house={other.house} status={x.d.status} held={x.d.status === "held"} fromInbox={sp.from === "inbox"} closed={closed} />}
      side={<Suspense fallback={<><SideSkeleton /><SideSkeleton /></>}><DealSide id={id} userId={u.id} meHandle={u.handle} buyer={buyer} blocked={blocked} /></Suspense>} />
  </>);
}

/* The right column: what happens next, the person, the deal. Loads beside the chat, never in front of it. */
async function DealSide({ id, userId, meHandle, buyer, blocked }: { id: string; userId: string; meHandle: string; buyer: boolean; blocked: "me" | "them" | null }) {
  const { t, locale } = await getT();
  const x = await deal(id, userId);
  if (!x) return null;
  const other = buyer ? x.creator : x.buyer;
  const [a, parts, lastDelivery, hold] = await Promise.all([
    buyer ? null : access(userId),
    buyer ? [] : listFor(userId),
    db.query.deliveries.findFirst({ where: eq(schema.deliveries.dealId, id), orderBy: desc(schema.deliveries.createdAt) }),
    buyer ? null : db.query.ledger.findFirst({ where: eq(schema.ledger.dealId, id), columns: { entry: true }, orderBy: desc(schema.ledger.createdAt) }),
  ]);
  const done = buyer && (x.d.status === "delivered" || x.d.status === "released");
  const circled = done ? await inCircle(userId, x.d.creatorId) : false;
  return (<>
    <Room
        me={{ id: userId, handle: meHandle, role: buyer ? "buyer" : "creator" }}
        other={{ id: other.id, handle: other.handle }}
        blocked={blocked}
        deal={{ id: x.d.id, status: x.d.status, dueAt: x.d.dueAt.toISOString(), objectUntil: x.d.objectUntil?.toISOString() ?? null, creatorCents: x.d.creatorCents, rated: !!x.d.buyerRating, ratedBuyer: !!x.d.creatorRating, category: x.r.category, amount: x.r.amount, stars: x.d.buyerRating, tipCents: x.d.tipCents, tipCreatorCents: x.d.tipCreatorCents, vatRate: x.d.vatRate, tipOpen: !x.d.deliveredAt || Date.now() - x.d.deliveredAt.getTime() < TIP_DAYS * 86400_000 }}
        delivery={lastDelivery ? { review: lastDelivery.review, onlyCreator: lastDelivery.onlyCreator } : null}
        canUpload={a?.caps.upload ?? false} missing={a?.missing ?? []} payoutHeld={hold?.entry === "payout_on_hold"}
        participants={parts.map((p) => ({ id: p.id, label: p.label, identity: p.identity }))}
        dispute={x.dispute ? { outcome: x.dispute.outcome } : null}

    />
    {done ? <SideCard tone="violet"><div className="sh-person"><span className="cx-av"><Av a={other.avatar} name={other.handle} size={48} /></span><div><b>{circled ? t("{name} is in your Inner Circle", { name: other.handle }) : t("Happy with {name}?", { name: other.handle })}</b><span>{t("Your Inner Circle sees your new requests 3 hours before everyone else, and you can send them personal requests.")}</span></div></div>
      <div className="sh-btns"><Link href={`/post?again=${x.d.id}`} className="btn btn-primary">{t("Order again")}</Link><CircleButton handle={other.handle} on={circled} /></div></SideCard> : null}
    <SideCard title={buyer ? t("Your creator") : t("The buyer")}>
      <div className="sh-person"><span className="cx-av"><Av a={other.avatar} name={other.handle} size={48} /></span><div><b>{other.handle}</b><span>{other.ratingCount ? `★ ${(other.ratingSum / other.ratingCount).toFixed(1)} · ${t("{n} ratings", { n: other.ratingCount })}` : t("New")}</span></div></div>
      <div className="sh-btns">{buyer ? <Link href={`/c/${other.handle}`} className="btn btn-secondary">{t("View profile")}</Link> : null}</div>
      <div className="sh-links"><Link href={`/report?type=deal&ref=${id}`}>{t("Report")}</Link>{blocked !== "me" ? <BlockButton handle={other.handle} /> : null}</div>
    </SideCard>
    <div className="card dsum" style={{ boxShadow: "none", padding: 0, border: 0 }}>
        <div className="dsum-media"><Cover cover={x.r.cover} /><span className="dsum-tag">{t(CAT_LABEL[x.r.category])} · {amountLabel(x.r.category, x.r.amount, t)}</span></div>
        <dl className="dsum-dl">
          <div><dt>{t("Face")}</dt><dd>{x.o.showsFace ? t("Face shown") : t("No face")}</dd></div>
          <div><dt>{t("Vault access")}</dt><dd>{t(VAULT_LABEL[x.o.vault])}</dd></div>
          <div><dt>{t("Deliver by")}</dt><dd>{when(x.d.dueAt, locale)}</dd></div>
          {x.r.callMe ? <div className="dsum-call"><dt>{buyer ? t("You are called") : t("Call them")}</dt><dd>“{x.r.callMe}”</dd></div> : null}
        </dl>
        <dl className="dsum-dl dsum-money">
          {buyer ? (<>
            <div><dt>{t("Budget")}</dt><dd className="num">{euros(x.d.dealCents)}</dd></div>
            <div><dt>{t("Service fee")}</dt><dd className="num">{euros(x.d.feeCents)}</dd></div>
            {x.d.vatCents ? <div><dt>{t("VAT {rate}%", { rate: x.d.vatRate / 100 })}</dt><dd className="num">{euros(x.d.vatCents)}</dd></div> : null}
            <div className="tot"><dt>{t("Paid")}</dt><dd className="num">{euros(x.d.dealCents + x.d.feeCents + x.d.vatCents)}</dd></div>
          </>) : (<>
            <div><dt>{t("Budget")}</dt><dd className="num">{euros(x.d.dealCents)}</dd></div>
            <div><dt>{t("Platform fee {rate}%", { rate: 20 })}</dt><dd className="num">−{euros(x.d.dealCents - x.d.creatorCents)}</dd></div>
            <div className="tot"><dt>{t("You earn")}</dt><dd className="num">{euros(x.d.creatorCents)}</dd></div>
          </>)}
        </dl>
      </div>
  </>);
}
