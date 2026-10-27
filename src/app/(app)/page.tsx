import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import * as q from "@/server/queries";
import { access } from "@/server/onboarding";
import { Av, Cover, I, RequestCard, Stars, leftLabel } from "@/components/ui";
import Ask from "@/components/ask";
import { CAT_LABEL, CREATOR_SHARE, euros, amountLabel, type Category } from "@/domain/rules";

const CATS: { k: Category; cover: string; ic: string }[] = [
  { k: "video", cover: "c05", ic: "video" }, { k: "photos", cover: "c21", ic: "image" }, { k: "voice", cover: "c17", ic: "mic" }, { k: "custom", cover: "c28", ic: "spark" },
];
const IDEAS = [
  { k: "Voice", t: "Good morning message", c: "voice", a: 1, p: 15 },
  { k: "Video", t: "After the gym, 10 minutes", c: "video", a: 10, p: 90 },
  { k: "Photos", t: "Fit check, 5 photos", c: "photos", a: 5, p: 30 },
  { k: "Custom", t: "Birthday clip with my name", c: "custom", a: 3, p: 45 },
];
const greet = () => { const h = new Date().getHours(); return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const u = await requireUser();
  const sell = u.isCreator && (await cookies()).get("brq_mode")?.value === "sell";
  return sell ? <CreatorHome userId={u.id} handle={u.handle} /> : <BuyerHome userId={u.id} handle={u.handle} welcome={!!(await searchParams).welcome} />;
}

async function BuyerHome({ userId, handle, welcome }: { userId: string; handle: string; welcome: boolean }) {
  const [mine, myDeals, vault, pulse, trending, ending, creators, stats] = await Promise.all([
    q.myRequests(userId), q.myDeals(userId), q.vault(userId), q.pulse(), q.feed({ viewerId: userId, limit: 12 }), q.feed({ viewerId: userId, tab: "ending", limit: 8 }), q.publicCreators(10), q.categoryStats(),
  ]);
  const openMine = mine.find((m) => m.r.status === "open");
  const live = myDeals.find((d) => d.d.buyerId === userId && ["held", "reviewing", "delivered", "disputed"].includes(d.d.status));
  const what = (c: Category, a: number) => c === "photos" ? `Set of ${a} photos` : c === "voice" ? `${a} min voice note` : c === "custom" ? `${a} min custom clip` : `${a} min video`;
  const ticker = pulse.recent.map((r) => `${what(r.cat, r.amount)} delivered in ${Math.max(1, Math.round(r.hours))}h`);
  const others = trending.filter((r) => !r.mine);
  const maxMed = Math.max(...Object.values(stats).map((s) => s.hi), 1);

  return (<div className="wrap">
    {welcome ? <div className="banner ok"><I n="check" /><div className="grow"><b>Welcome, {handle}.</b><div className="t-sm">Post your first request. Nothing is charged until you accept an offer.</div></div></div> : null}
    <div className="hello"><div><span className="eyebrow">{greet()}, {handle}</span><h1 className="t-display" style={{ marginTop: 10 }}>What are you looking for?</h1></div></div>
    <Ask />

    <div className="active-row" style={{ marginTop: 20 }}>
      {openMine ? (
        <Link href={`/requests/${openMine.r.id}/offers`} className="card act"><div className="media"><Cover cover={openMine.r.cover} frost /><span className="p num">{euros(openMine.r.dealCents)}</span></div>
          <div style={{ minWidth: 0 }}><span className="eyebrow">Your request</span><div className="t-h3" style={{ marginTop: 4 }}>{openMine.r.title}</div>
            <div className="sub"><span className="live"><i />{openMine.offers} offers waiting</span><span className="t-sm muted">Closes in {leftLabel(openMine.r.closesAt).replace(" left", "")}</span></div></div>
          <span className="btn btn-primary btn-sm">Review offers</span></Link>
      ) : (
        <Link href="/post" className="card act"><div className="media"><Cover cover="c26" /></div><div style={{ minWidth: 0 }}><span className="eyebrow">Start</span><div className="t-h3" style={{ marginTop: 4 }}>Post a request in a minute</div><div className="sub"><span className="t-sm muted">Free to post. Pay only when you accept.</span></div></div><span className="btn btn-primary btn-sm">Post</span></Link>
      )}
      {live ? (
        <Link href={`/deals/${live.d.id}`} className="card act"><div className="media"><Cover cover={live.r.cover} frost /></div><div style={{ minWidth: 0 }}><span className="eyebrow">Deal in progress</span><div className="t-h3" style={{ marginTop: 4 }}>{live.r.title}</div><div className="sub"><span className="t-sm muted">{live.d.status === "held" ? "Being made" : live.d.status === "reviewing" ? "Delivered, being reviewed" : live.d.status === "delivered" ? "In your vault, 24h to object" : "Under review"}</span></div></div><span className="btn btn-secondary btn-sm">Open</span></Link>
      ) : (
        <Link href="/vault" className="card act"><div className="media"><Cover cover="c18" /></div><div style={{ minWidth: 0 }}><span className="eyebrow">Vault</span><div className="t-h3" style={{ marginTop: 4 }}>{vault.length} items, private to you</div><div className="sub"><span className="t-sm muted">No download, no forwarding</span></div></div><span className="btn btn-secondary btn-sm">Open</span></Link>
      )}
    </div>

    <div className="pulse" aria-label="ByRequest this week">
      <div className="card"><span className="live"><i />Live</span><b className="num">{pulse.open}</b><span>open requests right now</span></div>
      <div className="card"><span>&nbsp;</span><b className="num">{euros(pulse.paidCents)}</b><span>paid to creators this week</span></div>
      <div className="card"><span>&nbsp;</span><b className="num">{Math.round(pulse.avgHours) || "<24"}h</b><span>average time to delivery</span></div>
      <div className="card"><span>&nbsp;</span><b className="num">{pulse.done}</b><span>deals completed, all reviewed</span></div>
    </div>
    {ticker.length ? <div className="ticker" aria-hidden="true"><div className="ticker-in">{[...ticker, ...ticker].map((t, i) => <span key={i}><I n="check" c="sm" />{t}</span>)}</div></div> : null}

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Browse by type</h2></div>
      <div className="cats" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>{CATS.map((c) => (
        <Link key={c.k} href={`/for-you?c=${c.k}`} className="cat media"><Cover cover={c.cover} /><I n={c.ic} c="lg" /><div>{CAT_LABEL[c.k]}<span className="c">{stats[c.k]?.n ?? 0} open now</span></div></Link>))}</div>
    </section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Trending requests</h2><span className="peekhint" style={{ marginLeft: "auto" }}>Hold a card to peek</span><Link href="/for-you">See all <I n="right" c="sm" /></Link></div>
      <div className="rail">{others.map((r) => <RequestCard key={r.id} r={r} />)}</div>
    </section>

    <div className="theme">
      <div className="media"><Cover cover="c06" /></div>
      <div className="tx"><span className="k">This week</span><h2>Gym week. Post workout, still warm.</h2><p>Requests with a workout theme get offers twice as fast this week. Join an open request or start your own.</p>
        <div className="row"><Link href="/post?c=video&amount=10&title=After%20the%20gym%2C%2010%20minutes&budget=90" className="btn btn-white">Start a gym request</Link><Link href="/for-you?c=video" className="btn btn-glass">See requests</Link></div></div>
    </div>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Ending soon</h2><Link href="/for-you?tab=ending">All <I n="right" c="sm" /></Link></div>
      <div className="rail">{ending.filter((r) => !r.mine).map((r) => <RequestCard key={r.id} r={r} />)}</div>
    </section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Ideas to start from</h2></div>
      <div className="ideas">{IDEAS.map((i) => (
        <Link key={i.t} className="idea" href={`/post?c=${i.c}&amount=${i.a}&budget=${i.p}&title=${encodeURIComponent(i.t)}`}><span className="k">{i.k}</span><b>{i.t}</b><span className="p num">{euros(i.p * 100)}</span></Link>))}</div>
    </section>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">What your budget gets</h2><span className="t-sm muted">Typical open requests right now</span></div>
      <div className="budget">{CATS.map((c) => { const s = stats[c.k]; return (
        <div key={c.k} className="card"><span className="k">{CAT_LABEL[c.k]}</span><b className="num">{s ? `${euros(s.lo)} to ${euros(s.hi)}` : "No data yet"}</b><i style={{ ["--w" as string]: `${s ? Math.round((s.hi / maxMed) * 100) : 0}%` }} /></div>); })}</div>
    </section>

    {creators.length ? (
      <section className="sec"><div className="sec-h"><h2 className="t-h2">Creators with a public profile</h2><span className="t-sm muted">Others only show when they make you an offer</span></div>
        <div className="creators">{creators.map(({ u: c, p }) => (
          <Link key={c.id} href={`/c/${c.handle}`} className="cr"><div className="media avfill"><Av a={c.avatar} name={c.handle} size={300} square /><div className="top"><span className="badge glass">{p.showsFace ? "Face shown" : "No face"}</span></div></div>
            <div><div className="row"><b>{c.handle}</b><span className="t-sm"><Stars sum={c.ratingSum} count={c.ratingCount} /></span></div><div className="m">{c.ratingCount ? `${c.ratingCount} deals · ` : ""}from {euros(p.fromCents)}</div></div></Link>))}</div>
      </section>) : null}

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Why it feels safe</h2></div>
      <div className="trust">
        <div className="card"><span className="ic"><I n="shield" /></span><b>Money held until it matches</b><p className="t-sm muted">The payment partner holds it. Checked, reviewed, then 24 hours for you to object.</p></div>
        <div className="card"><span className="ic"><I n="lock" /></span><b>End to end encrypted chat</b><p className="t-sm muted">Only you and the creator can read it. Not even ByRequest.</p></div>
        <div className="card"><span className="ic"><I n="vault" /></span><b>A private vault</b><p className="t-sm muted">No download, no forwarding, your name as watermark on every view.</p></div>
        <div className="card"><span className="ic"><I n="eyeoff" /></span><b>Discreet everywhere</b><p className="t-sm muted">No nudity in feeds, neutral notifications, BRQ DIGITAL on your statement.</p></div>
      </div>
    </section>
  </div>);
}

async function CreatorHome({ userId, handle }: { userId: string; handle: string }) {
  const [a, earn, fit, albums, offers] = await Promise.all([access(userId), q.creatorEarnings(userId), q.feed({ viewerId: userId, limit: 6 }), q.albumsForCreator(userId), q.myOffers(userId)]);
  const pts = earn.weeks.length ? earn.weeks.map((w) => w.c) : [0];
  const mx = Math.max(...pts, 1), W = 600, H = 80;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${((i * W) / Math.max(pts.length - 1, 1)).toFixed(1)} ${(H - 6 - (v / mx) * (H - 16)).toFixed(1)}`).join(" ");
  const pendingOffers = offers.filter((o) => o.o.status === "pending").length;
  return (<div className="wrap">
    {a.status === "active"
      ? <div className="banner ok"><I n="check" /><div className="grow"><b>You’re ready to earn.</b><div className="t-sm">Identity, agreement and payouts are approved{a.payout?.env === "test" ? " in the test environment" : ""}.</div></div>{a.payout?.env === "test" ? <span className="envtag">Test</span> : null}</div>
      : <div className={"banner " + (a.status === "action_required" || a.status === "restricted" ? "warn" : "info")}><I n={a.status === "pending_verification" ? "clock" : "alert"} />
          <div className="grow"><b>{a.status === "pending_verification" ? "Your verification is being reviewed." : a.status === "draft" ? "Verify once. Keep your profile private." : a.status === "suspended" ? "Your creator account is suspended." : a.areas.payout !== "approved" ? "Action needed to enable payouts." : "Action needed to finish your setup."}</b>
            <div className="t-sm">{a.missing.join(" · ")}</div></div>
          {a.status !== "suspended" ? <Link href="/onboarding" className="btn btn-primary btn-sm">Continue setup</Link> : null}</div>}

    <div className="hello"><div><span className="eyebrow">Hi {handle}</span><h1 className="t-display" style={{ marginTop: 10 }}>{fit.length} requests are open now</h1></div><Link href="/for-you" className="btn btn-primary"><I n="foryou" c="sm" />Browse requests</Link></div>

    <div className="earn-hero">
      <div className="card earn-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><div><span className="eyebrow">Earned this month</span><div className="big num" style={{ marginTop: 10 }}>{euros(earn.monthCents)}</div></div>{earn.heldCents ? <span className="badge amber">{euros(earn.heldCents)} waiting for payout setup</span> : null}</div>
        <svg className="spark" viewBox="0 0 600 80" preserveAspectRatio="none" role="img" aria-label="Weekly earnings, last 12 weeks"><path d={`${d} L600 80 L0 80 Z`} fill="var(--brand-soft)" /><path d={d} fill="none" stroke="var(--brand)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>
        <div className="kv"><div><b className="num">{euros(earn.pendingCents)}</b><span>In progress</span></div><div><b>{a.caps.receivePayouts ? "Friday" : "Not yet"}</b><span>Next payout</span></div><div><b className="num">{pendingOffers}</b><span>Open offers</span></div></div>
      </div>
      <div className="card terms"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 className="t-h3">Preview requests</h3><Link href="/studio" className="btn btn-ghost btn-sm">Studio</Link></div>
        <p className="t-sm muted">Buyers who are choosing can ask for a view once preview. You decide.</p>
        {albums.length ? albums.slice(0, 3).map((x) => <div key={x.a.id} className="term"><span className="muted">{x.buyer} · {x.a.kind}</span><Link href="/studio" className="btn btn-secondary btn-sm">Answer</Link></div>) : <div className="term"><span className="muted">No requests right now</span><b>All clear</b></div>}
      </div>
    </div>

    <section className="sec"><div className="sec-h"><h2 className="t-h2">Requests for you</h2><Link href="/for-you">Open feed <I n="right" c="sm" /></Link></div>
      <div className="card" style={{ padding: "4px 16px" }}><div className="list">{fit.filter((r) => !r.mine).map((r) => (
        <Link key={r.id} href={`/requests/${r.id}`} className="lrow"><div className="media"><Cover cover={r.cover} /></div><div style={{ minWidth: 0 }}><b>{r.title}</b><div className="t-sm muted">{CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)} · {r.ageMin} to {r.ageMax} · closes in {leftLabel(r.closesAt).replace(" left", "")}</div></div>
          <div className="r"><b className="num">{euros(Math.round(r.dealCents * CREATOR_SHARE))}</b><span className="t-xs muted">you earn</span></div></Link>))}</div></div>
    </section>
  </div>);
}
