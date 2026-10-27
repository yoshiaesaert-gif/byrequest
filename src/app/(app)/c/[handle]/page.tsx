import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { profileFor } from "@/server/queries";
import { Av, I, Stars } from "@/components/ui";
import { euros } from "@/domain/rules";
import AlbumAsk from "./album-ask";

export default async function Creator({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const me = await requireUser();
  const r = await profileFor(decodeURIComponent(handle), me.id);
  if (!r) notFound();
  if (r.hidden) return (<div className="wrap"><div className="card empty" style={{ maxWidth: 520, margin: "40px auto" }}>
    <span className="empty-i"><I n="lock" c="lg" /></span><b className="t-h3">This profile is private</b>
    <p className="muted t-sm">This creator shows their profile only to buyers they make an offer to.</p><Link href="/post" className="btn btn-primary">Post a request</Link></div></div>);
  const { u, p, reason, offerId, album, reviews, dealsDone } = r;
  const fact = (k: string, v: string | number | null | undefined) => (v ? <div><dt>{k}</dt><dd>{v}</dd></div> : null);
  // Same count as the home row and the offers list, so a creator never reads as "4.9 stars, 0 deals".
  const deals = Math.max(dealsDone, u.ratingCount);
  const replies = p.replyMinutes < 60 ? `Replies in ${p.replyMinutes} min` : `Replies in ${Math.round(p.replyMinutes / 60)}h`;
  return (<div className="wrap">
    <Link href={offerId ? "/deals" : "/"} className="back"><I n="left" c="sm" />Back</Link>
    <div className="cp">
      <div className="cp-side"><div className="cp-id">
        <div className="cp-av"><Av a={u.avatar} name={u.handle} size={200} square /></div>
        <h1 className="t-h1">{u.handle}</h1>
        <div className="t-sm muted"><Stars sum={u.ratingSum} count={u.ratingCount} /> · {deals} deals · {replies}</div>
        <div className="optrow" style={{ justifyContent: "center" }}><span className="badge ok"><I n="shield" c="sm" />Verified creator</span><span className="badge brand">{p.showsFace ? "Face shown" : "No face"}</span></div>
        <div className="cp-vis"><I n={reason === "public" ? "users" : "lock"} c="sm" />{reason === "public" ? "Public creator profile" : reason === "self" ? "This is how buyers see your profile." : `Private profile. You see it because ${u.handle} ${reason === "deal" ? "has a deal with you" : "made you an offer"}.`}</div>
      </div></div>
      <div className="cp-main">
        <section className="cp-sec"><span className="eyebrow">About</span>{p.bio ? <p className="cp-bio">{p.bio}</p> : null}
          <dl className="cp-spec">{fact("Age", u.age)}{fact("Height", p.heightCm ? `${(p.heightCm / 100).toFixed(2)} m` : null)}{fact("Build", p.build)}{fact("Sport", p.sport)}{fact("Work", p.work)}{fact("Languages", p.languages)}{fact("Hair", p.hair)}{fact("Eyes", p.eyes)}{fact("Body", p.body)}{fact("Tattoos", p.tattoos)}</dl></section>
        {offerId ? <AlbumAsk offerId={offerId} handle={u.handle} album={album ? { id: album.id, status: album.status } : null} /> : null}
        <section className="cp-sec"><span className="eyebrow">Makes</span>
          <div className="optrow" style={{ marginTop: 10 }}>{p.makes.map((d) => <span key={d} className="chip is-on" style={{ pointerEvents: "none" }}>{d}</span>)}</div>
          {p.never.length ? <p className="cp-never"><b>Never</b> {p.never.map((d) => d.toLowerCase()).join(", ")}</p> : null}
          <div className="list" style={{ marginTop: 14 }}>{[["Short video, 5 min", p.fromCents + 2000], ["Photo set, 6 photos", p.fromCents], ["Voice note, 2 min", Math.max(2000, p.fromCents - 1500)]].map(([t, c]) => (
            <div key={t as string} className="lrow" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><span>{t}</span><b className="num">From {euros(c as number)}</b></div>))}</div></section>
        <section className="cp-sec"><span className="eyebrow">Reviews</span>
          {reviews.length ? reviews.map((x, i) => <div key={i} className="cp-rev"><div><b>{x.by}</b><span className="star">{"★★★★★".slice(0, x.stars ?? 5)}</span></div></div>)
            : <p className="t-sm muted" style={{ marginTop: 8 }}>No reviews yet. Every creator verifies their identity before their first offer.</p>}</section>
      </div>
    </div>
  </div>);
}
