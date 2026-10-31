import AvZoom from "@/components/avzoom";
import { getT } from "@/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { profileFor } from "@/server/queries";
import { Av, I, Stars } from "@/components/ui";
import { euros } from "@/domain/rules";
import AlbumAsk from "./album-ask";
import { LABEL, sizeText } from "@/domain/looks-detail";
import { BlockButton, UnblockButton } from "@/components/block-button";
import { contactCreator } from "@/server/reports";
import { redirect } from "next/navigation";
import { cached } from "@/server/translate";
import { canSendPersonal, inCircle, workedWith, circleFans, HEAD_START } from "@/server/circle";
import { CircleButton } from "./circle-button";

const ago = (d: Date, t: (s: string, v?: Record<string, string | number>) => string) => {
  const days = Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
  return days < 1 ? t("today") : days < 2 ? t("yesterday") : days < 14 ? t("{n} days ago", { n: days }) : days < 60 ? t("{n} weeks ago", { n: Math.round(days / 7) }) : t("{n} months ago", { n: Math.round(days / 30) });
};

export default async function Creator({ params }: { params: Promise<{ handle: string }> }) {
  const { t, locale } = await getT();
  const { handle } = await params;
  const me = await requireUser();
  const r = await profileFor(decodeURIComponent(handle), me.id);
  if (!r) notFound();
  if (r.hidden) return (<div className="wrap"><div className="card empty" style={{ maxWidth: 520, margin: "40px auto" }}>
    <span className="empty-i"><I n="lock" c="lg" /></span><b className="t-h3">{t("This profile is private")}</b>
    <p className="muted t-sm">{t("This creator shows their profile only to buyers they make an offer to.")}</p><Link href="/post" className="btn btn-primary">{t("Post a request")}</Link></div></div>);
  if (r.blocked) return (<div className="wrap"><div className="card empty blocked-card">
    <span className="empty-i"><I n="block" c="lg" /></span><b className="t-h3">{t("You blocked {name}", { name: r.handle })}</b>
    <p className="muted t-sm">{t("You do not see each other's requests or profile, and there are no applications or chats between you.")}</p>
    <div className="optrow" style={{ justifyContent: "center" }}><UnblockButton handle={r.handle} className="btn btn-secondary" /><Link href={`/report?type=profile&ref=${encodeURIComponent(r.handle)}`} className="btn btn-ghost">{t("Report")}</Link></div></div></div>);
  const { u, p, reason, offerId, album, previewsLeft, reviews, dealsDone, detail, intimate } = r;
  const dt = (k: string, v?: string) => (v ? <div><dt>{t(k)}</dt><dd>{t(LABEL[v])}</dd></div> : null);
  // What the creator wrote reads in the viewer's language when a translation is cached.
  const own = [p.bio, p.build, p.sport, p.work, p.languages, p.hair, p.eyes, p.body, p.tattoos, ...p.makes, ...p.never, ...reviews.map((x) => x.text)].filter((x): x is string => !!x);
  const tr = await cached(own, locale);
  const L = <T extends string | null | undefined>(s: T) => (s ? tr.get(s) ?? (t(s) as T) : s);
  const fact = (k: string, v: string | number | null | undefined) => (v ? <div><dt>{t(k)}</dt><dd>{typeof v === "string" ? L(v) : v}</dd></div> : null);
  // Same count as the home row and the offers list, so a creator never reads as "4.9 stars, 0 deals".
  const deals = Math.max(dealsDone, u.ratingCount);
  const replies = p.replyMinutes < 60 ? t("Replies in {n} min", { n: p.replyMinutes }) : t("Replies in {n}h", { n: Math.round(p.replyMinutes / 60) });
  const [canP, inC, worked, fans] = reason === "self" ? [false, false, false, await circleFans(u.id)] : await Promise.all([canSendPersonal(me.id, u.id), inCircle(me.id, u.id), workedWith(me.id, u.id), circleFans(u.id)]);
  return (<div className="wrap">
    <Link href={offerId ? "/deals" : "/"} className="back"><I n="left" c="sm" />{t("Back")}</Link>
    <div className="cp">
      <div className="cp-side"><div className="cp-id">
        <div className="cp-av"><AvZoom a={u.avatar} name={u.handle} size={200} square /></div>
        <h1 className="t-h1">{u.handle}</h1>
        <div className="t-sm muted"><Stars sum={u.ratingSum} count={u.ratingCount} t={t} /> · {t("{n} deals", { n: deals })} · {replies}</div>
        <div className="optrow" style={{ justifyContent: "center" }}><span className="badge ok"><I n="shield" c="sm" />{t("Verified creator")}</span><span className="badge brand">{p.showsFace ? t("Face shown") : t("No face")}</span>{fans ? <span className="badge ic-badge">{t(fans === 1 ? "In 1 Inner Circle" : "In {n} Inner Circles", { n: fans })}</span> : null}</div>
        {reason !== "self" ? <div className="ic-box">
          {canP ? <Link href={`/post?to=${encodeURIComponent(u.handle)}`} className="btn btn-primary btn-block"><I n="send" c="sm" />{t("Send a personal request")}</Link> : null}
          {inC || worked ? <CircleButton handle={u.handle} on={inC} /> : null}
          <p className="t-xs muted">{inC ? t("{name} sees your new requests {h} hours before everyone else.", { name: u.handle, h: HEAD_START }) : worked ? t("Happy with {name}? Add them to your Inner Circle: they see your new requests {h} hours before everyone else.", { name: u.handle, h: HEAD_START }) : canP ? t("Only {name} sees a personal request. Nobody else.", { name: u.handle }) : t("After a first deal you can add {name} to your Inner Circle.", { name: u.handle })}</p>
        </div> : null}
        {reason !== "self" ? <div className="safe-row" style={{ justifyContent: "center" }}><Link href={`/report?type=profile&ref=${encodeURIComponent(u.handle)}`} className="report-link"><I n="alert" c="sm" />{t("Report this profile")}</Link><BlockButton handle={u.handle} after="/" /></div> : null}
        <div className="cp-vis"><I n={reason === "public" ? "users" : "lock"} c="sm" />{reason === "public" ? t("Public creator profile") : reason === "self" ? t("This is how buyers see your profile.") : t(reason === "deal" ? "Private profile. You see it because {name} has a deal with you." : "Private profile. You see it because {name} made you an offer.", { name: u.handle })}</div>
      </div></div>
      <div className="cp-main">
        <section className="cp-sec"><span className="eyebrow">{t("About")}</span>{p.bio ? <p className="cp-bio">{L(p.bio)}</p> : null}
          <dl className="cp-spec">{fact("Age", u.age)}{fact("Height", p.heightCm ? `${(p.heightCm / 100).toFixed(2)} m` : null)}{fact("Weight", p.weightKg ? `${p.weightKg} kg` : null)}{fact("Build", p.build)}{fact("Sport", p.sport)}{fact("Work", p.work)}{fact("Languages", p.languages)}{fact("Hair", p.hair)}{fact("Eyes", p.eyes)}{fact("Distinctive features", p.body)}{fact("Tattoos", p.tattoos)}{dt("Gender", detail.gender)}{intimate ? <>{dt("Body hair", detail.bodyHair)}{dt("Pubic hair", detail.pubic)}{sizeText(detail) ? <div><dt>{t("Penis length")}</dt><dd>{detail.sizeCm ? sizeText(detail) : t(sizeText(detail)!)}</dd></div> : null}{dt("Circumcised", detail.cut)}{dt("Cup size", detail.cup)}</> : null}</dl>{!intimate ? <p className="t-xs muted cp-intimate"><I n="lock" c="sm" />{t("More details about how they look show once this creator applies for your request.")}</p> : null}</section>
        {offerId ? <AlbumAsk offerId={offerId} handle={u.handle} album={album ? { id: album.id, status: album.status } : null} left={previewsLeft} /> : null}
        <section className="cp-sec"><span className="eyebrow">{t("Makes")}</span>
          <div className="optrow" style={{ marginTop: 10 }}>{p.makes.map((d) => <span key={d} className="chip is-on" style={{ pointerEvents: "none" }}>{L(d)}</span>)}</div>
          {p.never.length ? <p className="cp-never"><b>{t("Never")}</b> {p.never.map((d) => L(d).toLowerCase()).join(", ")}</p> : null}
          <div className="list" style={{ marginTop: 14 }}>{[["Short video, 5 min", p.fromCents + 2000], ["Photo set, 6 photos", p.fromCents], ["Voice note, 2 min", Math.max(2000, p.fromCents - 1500)]].map(([l, c]) => (
            <div key={l as string} className="lrow" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><span>{t(l as string)}</span><b className="num">{t("From")} {euros(c as number)}</b></div>))}</div></section>
        {me.supportOrg ? <section className="cp-sec"><span className="eyebrow">{t("Support organisation")}</span>
          <form className="bo-inline" style={{ marginTop: 10 }} action={async (f) => { "use server"; const m = await requireUser(); await contactCreator(m.id, u.handle, String(f.get("msg") ?? "")); redirect(`/c/${u.handle}?sent=1`); }}>
            <input className="input" name="msg" placeholder={t("Write to {name} as {org}", { name: u.handle, org: me.supportOrg })} required minLength={10} /><button className="btn btn-primary btn-sm">{t("Send")}</button></form></section> : null}
        <section className="cp-sec"><span className="eyebrow">{t("Reviews")}</span>
          {reviews.length ? reviews.map((x, i) => <div key={i} className="cp-rev"><div><b>{x.by}</b><span className="star">{"★★★★★".slice(0, x.stars ?? 5)}<span className="cp-rev-off">{"★★★★★".slice(x.stars ?? 5)}</span></span>{x.extra ? <span className="badge ok cp-extra">{t("Went the extra mile")}</span> : null}<span className="cp-rev-m">{t("Verified deal")}{x.at ? ` · ${ago(x.at, t)}` : ""}</span></div>{x.text ? <p>{L(x.text)}</p> : null}</div>)
            : <p className="t-sm muted" style={{ marginTop: 8 }}>{t("No reviews yet. Every creator verifies their identity before their first offer.")}</p>}</section>
      </div>
    </div>
  </div>);
}
