import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { deal } from "@/server/queries";
import { access } from "@/server/onboarding";
import { listFor } from "@/server/participants";
import { Av, Cover, I, when } from "@/components/ui";
import { CAT_LABEL, VAULT_LABEL, amountLabel, euros } from "@/domain/rules";
import Room from "./room";
import { getT } from "@/i18n/server";

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ accepted?: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const { t } = await getT();
  const x = await deal(id, u.id);
  if (!x) notFound();
  const buyer = x.d.buyerId === u.id;
  const other = buyer ? x.creator : x.buyer;
  const [a, parts, lastDelivery, hold] = await Promise.all([
    buyer ? null : access(u.id),
    buyer ? [] : listFor(u.id),
    db.query.deliveries.findFirst({ where: eq(schema.deliveries.dealId, id), orderBy: desc(schema.deliveries.createdAt) }),
    buyer ? null : db.query.ledger.findFirst({ where: eq(schema.ledger.dealId, id), columns: { entry: true }, orderBy: desc(schema.ledger.createdAt) }),
  ]);
  const accepted = (await searchParams).accepted;
  return (<div className="wrap">
    <Link href="/deals" className="back"><I n="left" c="sm" />{buyer ? t("Deals") : t("Offers")}</Link>
    {accepted ? <div className="banner ok"><I n="check" /><div className="grow"><b>{t("Payment secured.")}</b><div className="t-sm">{t("{amount} is held by the payment partner until delivery. It shows as BRQ DIGITAL.", { amount: euros(x.d.dealCents + x.d.feeCents + x.d.vatCents) })}</div></div></div> : null}
    <div className="page-h"><div style={{ display: "flex", gap: 14, alignItems: "center" }}><Av a={other.avatar} name={other.handle} size={52} /><div><span className="eyebrow">{t("Deal with {name}", { name: other.handle })}</span><h1 className="t-h1" style={{ marginTop: 4 }}>{x.r.title}</h1></div></div></div>
    <div className="two">
      <Room
        me={{ id: u.id, handle: u.handle, role: buyer ? "buyer" : "creator" }}
        other={{ id: other.id, handle: other.handle, publicKey: other.publicKey }}
        deal={{ id: x.d.id, status: x.d.status, dueAt: x.d.dueAt.toISOString(), objectUntil: x.d.objectUntil?.toISOString() ?? null, creatorCents: x.d.creatorCents, rated: !!x.d.buyerRating, ratedBuyer: !!x.d.creatorRating, category: x.r.category, amount: x.r.amount }}
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
          <div><dt>{t("Deliver by")}</dt><dd>{when(x.d.dueAt)}</dd></div>
        </dl>
        <dl className="dsum-dl dsum-money">
          {buyer ? (<>
            <div><dt>{t("Offer")}</dt><dd className="num">{euros(x.d.dealCents)}</dd></div>
            <div><dt>{t("Service fee")}</dt><dd className="num">{euros(x.d.feeCents)}</dd></div>
            {x.d.vatCents ? <div><dt>{t("VAT")} {x.d.vatRate / 100}%</dt><dd className="num">{euros(x.d.vatCents)}</dd></div> : null}
            <div className="tot"><dt>{x.d.vatCents ? t("Secured, VAT incl.") : t("Secured")}</dt><dd className="num">{euros(x.d.dealCents + x.d.feeCents + x.d.vatCents)}</dd></div>
          </>) : (<>
            <div><dt>{t("Deal value")}</dt><dd className="num">{euros(x.d.dealCents)}</dd></div>
            <div className="tot"><dt>{t("You earn")}</dt><dd className="num">{euros(x.d.creatorCents)}</dd></div>
          </>)}
        </dl>
      </div></aside>
    </div>
  </div>);
}
