import Link from "next/link";
import { inCircle } from "@/server/circle";
import { CircleButton } from "../../c/[handle]/circle-button";
import { resealTeamDeal } from "@/server/teamchat";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { deal, markChatRead } from "@/server/queries";
import { access } from "@/server/onboarding";
import { listFor } from "@/server/participants";
import { Av, Cover, I, when } from "@/components/ui";
import { CAT_LABEL, VAULT_LABEL, amountLabel, euros } from "@/domain/rules";
import Room from "./room";
import { TIP_DAYS } from "@/server/deals";
import { blockedEither, iBlocked } from "@/server/blocks";
import { getT } from "@/i18n/server";
import { textsIn } from "@/server/translate";

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ accepted?: string; from?: string }> }) {
  const { id } = await params;
  const [u, { t, locale }] = await Promise.all([requireUser(), getT()]);
  await resealTeamDeal(id).catch(() => {});   // team chats follow the creator to a new device
  const x = await deal(id, u.id);
  if (!x) notFound();
  const buyer = x.d.buyerId === u.id;
  const other = buyer ? x.creator : x.buyer;
  const otherReadAt = buyer ? x.d.creatorReadAt : x.d.buyerReadAt;
  // Everything else at once: a chat has to open instantly.
  const [L, , a, parts, lastDelivery, hold] = await Promise.all([
    textsIn([x.r.title], locale),
    markChatRead(id, u.id, buyer),
    buyer ? null : access(u.id),
    buyer ? [] : listFor(u.id),
    db.query.deliveries.findFirst({ where: eq(schema.deliveries.dealId, id), orderBy: desc(schema.deliveries.createdAt) }),
    buyer ? null : db.query.ledger.findFirst({ where: eq(schema.ledger.dealId, id), columns: { entry: true }, orderBy: desc(schema.ledger.createdAt) }),
  ]);
  const accepted = (await searchParams).accepted;
  const done = buyer && (x.d.status === "delivered" || x.d.status === "released");
  const circled = done ? await inCircle(u.id, x.d.creatorId) : false;
  return (<div className="wrap">
    {(await searchParams).from === "inbox" ? <Link href="/inbox" className="back"><I n="left" c="sm" />{t("Inbox")}</Link> : <Link href="/deals" className="back"><I n="left" c="sm" />{buyer ? t("Deals") : t("Applications")}</Link>}
    {accepted ? <div className="banner ok"><I n="check" /><div className="grow"><b>{t("Payment secured.")}</b><div className="t-sm">{t("{amount} is held by the payment partner until delivery. It shows as BRQ DIGITAL.", { amount: euros(x.d.dealCents + x.d.feeCents + x.d.vatCents) })}</div></div></div> : null}
    {done ? <div className="ic-for ic-deal"><div><b>{circled ? t("{name} is in your Inner Circle", { name: other.handle }) : t("Happy with {name}?", { name: other.handle })}</b><span>{t("Your Inner Circle sees your new requests 3 hours before everyone else, and you can send them personal requests.")}</span></div><CircleButton handle={other.handle} on={circled} /></div> : null}
    <div className="page-h"><div style={{ display: "flex", gap: 14, alignItems: "center" }}><Av a={other.avatar} name={other.handle} size={52} /><div><span className="eyebrow">{t("Deal with {name}", { name: other.handle })}</span><h1 className="t-h1" style={{ marginTop: 4 }}>{L(x.r.title)}</h1></div></div></div>
    <div className="two">
      <Room
        me={{ id: u.id, handle: u.handle, role: buyer ? "buyer" : "creator" }}
        other={{ id: other.id, handle: other.handle, publicKey: other.publicKey, readAt: otherReadAt?.toISOString() ?? null }}
        blocked={(await blockedEither(u.id, other.id)) ? ((await iBlocked(u.id, other.id)) ? "me" : "them") : null}
        deal={{ id: x.d.id, status: x.d.status, dueAt: x.d.dueAt.toISOString(), objectUntil: x.d.objectUntil?.toISOString() ?? null, creatorCents: x.d.creatorCents, rated: !!x.d.buyerRating, ratedBuyer: !!x.d.creatorRating, category: x.r.category, amount: x.r.amount, stars: x.d.buyerRating, tipCents: x.d.tipCents, tipCreatorCents: x.d.tipCreatorCents, vatRate: x.d.vatRate, tipOpen: !x.d.deliveredAt || Date.now() - x.d.deliveredAt.getTime() < TIP_DAYS * 86400_000 }}
        delivery={lastDelivery ? { review: lastDelivery.review, onlyCreator: lastDelivery.onlyCreator } : null}
        canUpload={a?.caps.upload ?? false} missing={a?.missing ?? []} payoutHeld={hold?.entry === "payout_on_hold"}
        participants={parts.map((p) => ({ id: p.id, label: p.label, identity: p.identity }))}
        dispute={x.dispute ? { outcome: x.dispute.outcome } : null}
        msgs={x.msgs.map((m) => ({ id: m.id, kind: m.kind, senderId: m.senderId, nonce: m.nonce, body: m.body, at: m.createdAt.toISOString() }))}
      />
      <aside className="sticky"><div className="card dsum">
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
      </div></aside>
    </div>
  </div>);
}
