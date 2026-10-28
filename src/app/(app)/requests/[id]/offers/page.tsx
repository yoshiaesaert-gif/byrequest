import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { offersFor, request } from "@/server/queries";
import { I, svgSrc } from "@/components/ui";
import { CAT_LABEL, VAULT_LABEL, amountLabel, quote } from "@/domain/rules";
import { vatRate, BUYER_AGE_CHECK } from "@/config/compliance";
import { isAgeVerified } from "@/server/onboarding";
import { WAIVER_TEXT } from "@/server/deals";
import Picker from "./picker";
import { getT } from "@/i18n/server";
import { cached, textsIn } from "@/server/translate";

export default async function Offers({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const { t, locale } = await getT();
  const r = await request(id);
  if (!r || r.buyerId !== u.id) notFound();
  const list = await offersFor(id);
  const L = await textsIn([r?.title], locale);
  const notes = await cached(list.map((x) => x.o.note).filter(Boolean), locale);
  const deal = r.status === "matched" ? await db.query.deals.findFirst({ where: eq(schema.deals.requestId, id) }) : null;
  const m = quote(r.dealCents, vatRate(u.country));
  const ageOk = !BUYER_AGE_CHECK || (await isAgeVerified(u.id));
  const open = r.status === "open" && r.closesAt > new Date();
  return (<div className="wrap">
    <Link href="/deals" className="back"><I n="left" c="sm" />{t("Deals")}</Link>
    {r.status === "in_review" ? <div className="banner info"><I n="clock" /><div className="grow"><b>{t("Your request is being checked")}</b><div className="t-sm">{t("Every request is checked by the ByRequest team before it goes live. Usually within a few hours. You get a notification as soon as creators can see it.")}</div></div></div>
      : r.status === "rejected" ? <div className="banner warn"><I n="alert" /><div className="grow"><b>{t("Your request was not published")}</b><div className="t-sm">{t("You received a message with the reason and how to appeal. You can post a new request that follows the rules.")}</div></div><Link href="/post" className="btn btn-primary btn-sm">{t("New request")}</Link></div>
      : (await searchParams).posted ? <div className="banner ok"><I n="check" /><div className="grow"><b>{t("Your request is live.")}</b><div className="t-sm">{t("Creators who fit will make offers. You get a neutral notification for each one.")}</div></div></div> : null}
    <div className="page-h"><div><span className="eyebrow">{t("Your request")} · {r.status === "in_review" ? t("in review") : r.status === "rejected" ? t("not published") : open ? t("open") : t("closed")}</span><h1 className="t-h1" style={{ marginTop: 6 }}>{L(r.title)}</h1>
      <p className="muted t-sm" style={{ marginTop: 6 }}>{t(CAT_LABEL[r.category])} · {amountLabel(r.category, r.amount, t)} · {t(r.who)}, {t("{a} to {b}", { a: r.ageMin, b: r.ageMax })} · {t(r.face === "not_needed" ? "No face needed" : r.face === "optional" ? "Face optional" : "Face required")} · {t("Vault at least")} {t(VAULT_LABEL[r.minVault]).toLowerCase()}</p></div></div>
    <Picker
      requestId={r.id} open={open} dealId={deal?.id ?? null}
      money={{ deal: m.dealCents, fee: m.feeCents, vat: m.vatCents, vatPct: m.vatRate / 100, total: m.total }} ageOk={ageOk} waiver={WAIVER_TEXT}
      offers={list.map(({ o, u: c, p }) => ({ id: o.id, status: o.status, showsFace: o.showsFace, vault: o.vault, etaHours: o.etaHours, note: notes.get(o.note) ?? o.note, handle: c.handle, look: c.avatar?.kind === "3d" ? `/av/${c.avatar.look}.webp` : c.avatar?.kind === "built" && c.avatar.svg ? svgSrc(c.avatar.svg) : null, rating: c.ratingCount ? c.ratingSum / c.ratingCount : null, deals: c.ratingCount, visibility: p.visibility }))}
    />
  </div>);
}
