import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { request } from "@/server/queries";
import { access } from "@/server/onboarding";
import { BigNum, BuyerLine, Chips, Cover, I, leftLabel } from "@/components/ui";
import { CAT_LABEL, VAULT_LABEL, euros, split } from "@/domain/rules";
import OfferForm from "./offer-form";
import OfferTalk from "./talk";
import { profileMissing } from "@/domain/looks-detail";
import { BlockButton } from "@/components/block-button";
import { blockedEither } from "@/server/blocks";
import { RemoveRequest } from "../../admin/parts";
import { getT } from "@/i18n/server";
import { localize } from "@/server/translate";
import { LANG_NAME, isLocale } from "@/i18n/config";

const CAT_ICON: Record<string, string> = { video: "video", photos: "image", voice: "mic", custom: "spark", worn: "shirt" };
export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ orig?: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const raw = await request(id);
  if (!raw) notFound();
  const { t, locale } = await getT();
  const showOrig = !!(await searchParams).orig;
  const [loc] = await localize([raw], locale);
  const r = showOrig ? { ...loc, title: raw.title, details: raw.details } : loc;
  if (r.buyerId === u.id) redirect(`/requests/${id}/offers`);
  if (await blockedEither(u.id, r.buyerId)) notFound();   // blocked either way: the request does not exist for them
  const [a, mine, offers] = await Promise.all([
    u.isCreator ? access(u.id) : null,
    db.query.offers.findFirst({ where: and(eq(schema.offers.requestId, id), eq(schema.offers.creatorId, u.id)) }),
    db.select({ id: schema.offers.id }).from(schema.offers).where(eq(schema.offers.requestId, id)),
  ]);
  const staff = await db.query.staff.findFirst({ where: eq(schema.staff.userId, u.id) });
  // Requests in review or rejected are only visible to their buyer and to the team.
  const unpublished = r.status === "in_review" || r.status === "rejected";
  if (unpublished && !staff) notFound();
  const profile = u.isCreator ? await db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, u.id) }) : null;
  const m = split(r.dealCents);
  const open = r.status === "open" && r.closesAt > new Date();
  const card = { ...r, offers: offers.length };

  return (<div className="wrap">
    <Link href="/for-you" className="back"><I n="left" c="sm" />{t("Requests")}</Link>
    {unpublished ? <div className="banner warn"><I n="alert" /><div className="grow"><b>{r.status === "in_review" ? t("Not published: waiting for review") : t("Not published: rejected")}</b><div className="t-sm">{t("Only the team and the buyer see this page.")}</div></div><Link href={`/admin/requests/${id}`} className="btn btn-primary btn-sm">{t("Review in back office")}</Link></div> : null}
    {mine && mine.status === "pending" ? <a href="#offer" className="applied-flag"><I n="check" />{t("You applied for this request")}<span className="applied-go">{t("View")}</span></a> : null}
    <div className="two">
      <div>
        <div className="rd">
          <div className="rd-media">
            <Cover cover={r.cover} />
            <span className="rd-shade" />
            <div className="rd-top"><Chips r={card} t={t} />{r.buyerId === u.id && offers.length ? <span className="mc">{t(offers.length === 1 ? "{n} offer" : "{n} offers", { n: offers.length })}</span> : null}</div>
            <div className="rd-bottom">
              <div className="rd-title">
                <span className="rd-cat"><I n={CAT_ICON[r.category]} c="sm" />{t(CAT_LABEL[r.category])} · {open ? leftLabel(r.closesAt, t) : t("closed")}</span>
                <h1>{r.title}</h1>
              </div>
              <BigNum r={card} t={t} />
            </div>
          </div>
          {r.details ? <blockquote className="rd-note"><span className="rd-note-h">{t("From the buyer")}<BuyerLine b={r.buyer} t={t} /></span>{r.details}</blockquote> : <p className="rd-buyer">{t("Buyer")} <BuyerLine b={r.buyer} t={t} /></p>}
          {loc.translated && isLocale(raw.lang) ? <p className="rd-tr">{showOrig ? t("Original text in {lang}", { lang: LANG_NAME[locale][raw.lang] }) : t("Translated from {lang}", { lang: LANG_NAME[locale][raw.lang] })} · <Link href={showOrig ? `/requests/${id}` : `/requests/${id}?orig=1`}>{showOrig ? t("show translation") : t("show original")}</Link></p> : null}
          {staff && open ? <div className="rd-staff"><span className="t-sm muted">{t("Team")}</span><RemoveRequest id={r.id} /></div> : null}
          {r.house ? <p className="by-brq">{t("Posted by the ByRequest team, with a real budget.")} <Link href="/legal/team-requests">{t("How this works")}</Link></p> : null}
          <dl className="rd-spec">
            <div><dt>{t("Looking for")}</dt><dd>{t(r.who)}, {t("{a} to {b}", { a: r.ageMin, b: r.ageMax })}</dd></div>
            <div><dt>{t("Face")}</dt><dd>{t(r.face === "not_needed" ? "Not needed" : r.face === "optional" ? "Optional" : "Required")}</dd></div>
            {r.callMe ? <div><dt>{t("Personal")}</dt><dd>{t("Wants to be addressed by a name or title. You see it once chosen.")}</dd></div> : null}
            <div><dt>{t("Deliver within")}</dt><dd>{r.dueHours < 72 ? t("{n} hours", { n: r.dueHours }) : t("{n} days", { n: Math.round(r.dueHours / 24) })}</dd></div>
            <div><dt>{t("Vault at least")}</dt><dd>{t(VAULT_LABEL[r.minVault])}</dd></div>
          </dl>
          <div className="safe-row"><Link href={`/report?type=request&ref=${r.id}`} className="report-link"><I n="alert" c="sm" />{t("Report this request")}</Link>{u.isCreator && r.buyerId !== u.id ? <BlockButton handle={t("this buyer")} requestId={r.id} label={t("Block this buyer")} after="/for-you" /> : null}</div>
          <p className="rd-how">{t("You make an offer and the buyer picks one creator. The payment is secured before you start, and {amount} is released to you after review and the 24 hour window.", { amount: euros(m.creatorCents) })}</p>
        </div>
      </div>
      <aside className="sticky" id="offer">
        <div className="card checkout">
          <dl className="earnsplit"><div><dt>{t("Budget")}</dt><dd className="num">{euros(m.dealCents)}</dd></div>
            <div><dt>{t("Platform fee {rate}%", { rate: 20 })}</dt><dd className="num">−{euros(m.dealCents - m.creatorCents)}</dd></div>
            <div className="tot"><dt>{t("You receive")}</dt><dd className="num">{euros(m.creatorCents)}</dd></div></dl>
          {!open ? <p className="t-sm muted">{t("This request is closed.")}</p>
            : !u.isCreator ? (<>
              <b className="t-h3">{t("Want to make this?")}</b>
              <p className="t-sm muted">{t("Become a creator in a few steps. Your legal name and ID are never shown on your profile.")}</p>
              <Link href="/earn" className="btn btn-primary btn-block">{t("Start creating")}</Link>
              <Link href={`/post?c=${r.category}&amount=${r.amount}&budget=${Math.round(r.dealCents / 100)}&title=${encodeURIComponent(r.title)}`} className="btn btn-secondary btn-block">{t("Post a similar request")}</Link>
            </>)
            : !a!.caps.offer ? (<>
              <b className="t-h3">{t(a!.status === "pending_verification" ? "Your verification is being reviewed." : a!.areas.payout !== "approved" && a!.areas.identity === "approved" ? "Action needed to enable payouts." : "Finish your setup to make offers")}</b>
              <ul className="docsum">{a!.missing.map((x) => <li key={x}><I n="alert" c="sm" />{t(x)}</li>)}</ul>
              {a!.status !== "suspended" ? <Link href="/onboarding" className="btn btn-primary btn-block">{t("Continue setup")}</Link> : null}
            </>)
            : !mine && profileMissing(profile).length ? (<>
              <b className="t-h3">{t("Complete your public profile to apply")}</b>
              <p className="t-sm muted">{t("Buyers choose on how you look. Fill in these few details once; they stay private until you apply.")}</p>
              <ul className="docsum">{profileMissing(profile).map((x) => <li key={x}><I n="alert" c="sm" />{t(x)}</li>)}</ul>
              <Link href="/settings#creator" className="btn btn-primary btn-block">{t("Complete my profile")}</Link>
            </>)
            : <OfferForm requestId={r.id} minVault={r.minVault} faceRequired={r.face === "required"} dueHours={r.dueHours} existing={mine ? { showsFace: mine.showsFace, vault: mine.vault, etaHours: mine.etaHours, note: mine.note, status: mine.status, at: mine.createdAt.toISOString() } : null} rivals={offers.length - (mine ? 1 : 0)} defaults={{ showsFace: profile?.showsFace ?? false, vault: profile?.defaultVault ?? "30d" }} />}
          {mine ? <OfferTalk offerId={mine.id} uid={u.id} /> : null}
          <div className="protect"><span><I n="shield" c="sm" />{t("The buyer’s payment is secured before you start")}</span><span><I n="lock" c="sm" />{t("Chats are encrypted")}</span><span><I n="eyeoff" c="sm" />{t("Buyers see your username and avatar only")}</span></div>
        </div>
      </aside>
    </div>
  </div>);
}
