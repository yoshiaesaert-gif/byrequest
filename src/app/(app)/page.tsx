import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import * as q from "@/server/queries";
import { access } from "@/server/onboarding";
import { Av, Cover, I, RequestCard, Stars, leftLabel, svgSrc } from "@/components/ui";
import HeroLive from "@/components/hero-live";
import Ask from "@/components/ask";
import { parseAsk as parseAskHref } from "@/components/ask-parse";
import { PromiseIcon } from "@/components/promise-icons";
import { CAT_LABEL, CREATOR_SHARE, euros, amountLabel, type Category } from "@/domain/rules";

const greet = () => { const h = new Date().getHours(); return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string; board?: string }> }) {
  const u = await requireUser();
  const sell = u.isCreator && (await cookies()).get("brq_mode")?.value === "sell";
  const sp = await searchParams;
  return sell ? <CreatorHome userId={u.id} handle={u.handle} /> : <BuyerHome userId={u.id} handle={u.handle} welcome={!!sp.welcome} board={sp.board} />;
}

const DROPS = [
  { k: "Gym week", t: "Post workout, still warm.", d: "Workout requests get offers twice as fast this week.", cover: "c06", c: "video", href: "/post?c=video&amount=10&title=After%20the%20gym%2C%2010%20minutes&budget=90" },
  { k: "After dark", t: "A voice that says your name.", d: "Good night notes, recorded tonight.", cover: "c16", c: "voice", href: "/post?c=voice&amount=2&title=Good%20night%20voice%20note%2C%20with%20my%20name&budget=25" },
  { k: "Morning light", t: "Just woke up. Coffee first.", d: "Slow mornings, soft light, no rush.", cover: "c11", c: "video", href: "/post?c=video&amount=5&title=Morning%20routine%2C%20just%20woke%20up&budget=60" },
  { k: "Fit check", t: "Tell me what to wear.", d: "Outfit sets in full resolution.", cover: "c21", c: "photos", href: "/post?c=photos&amount=5&title=Fit%20check%2C%205%20photos&budget=30" },
];
const PROMISES = [
  { i: "held", t: "Money held until it matches", d: "Our payment partner holds it. You pay only for what was agreed, checked and reviewed." },
  { i: "e2e", t: "Chats nobody else can read", d: "End to end encrypted on your device. Not even ByRequest can open them." },
  { i: "vault", t: "A vault that stays yours", d: "No download, no forwarding, your name on every view." },
  { i: "adults", t: "Verified adults only", d: "Every creator verifies ID and age once. Their legal name stays private." },
  { i: "billing", t: "Discreet everywhere", d: "BRQ DIGITAL on your statement, neutral alerts, quick hide on every screen." },
  { i: "fair", t: "Fair when it goes wrong", d: "24 hours to object. A person decides. Cheating costs more than it earns." },
] as const;
const EXAMPLES = ["10 min shower video", "Good night voice note", "Post workout photo set", "Fit check, 5 photos"];

async function BuyerHome({ userId, handle, welcome, board }: { userId: string; handle: string; welcome: boolean; board?: string }) {
  const cat = ["video", "photos", "voice", "custom"].includes(board ?? "") ? board : undefined;
  const [mine, myDeals, pulse, top, boardItems, ending, creators, stats] = await Promise.all([
    q.myRequests(userId), q.myDeals(userId), q.pulse(), q.feed({ viewerId: userId, limit: 6 }), q.feed({ viewerId: userId, tab: "new", category: cat, limit: 20 }),
    q.feed({ viewerId: userId, tab: "ending", limit: 16 }), q.publicCreators(18), q.categoryStats(),
  ]);
  const openMine = mine.find((m) => m.r.status === "open");
  const live = myDeals.find((d) => d.d.buyerId === userId && ["held", "reviewing", "delivered", "disputed"].includes(d.d.status));
  // Every request shows once on the page: hero, board and closing soon never repeat each other.
  const fan = top.filter((r) => !r.mine).slice(0, 3);
  const shown = new Set(fan.map((r) => r.id));
  const items = boardItems.filter((r) => !r.mine && !shown.has(r.id)).slice(0, 7);
  items.forEach((r) => shown.add(r.id));
  const soon = ending.filter((r) => !r.mine && !shown.has(r.id));
  const [feat, ...rest] = items;
  // Hero: the open request with the most offers from creators with an open profile. Offer only
  // creators stay hidden, because they only show to the buyer they made an offer to.
  const cands = await Promise.all(fan.map(async (r) => ({ r, o: (await q.offersFor(r.id)).filter((x) => x.p.visibility === "public") })));
  for (const c of cands) { const d3 = c.o.filter((x) => x.u.avatar?.kind === "3d"); if (d3.length >= 2) c.o = d3; }
  const best = cands.sort((a, b) => b.o.length - a.o.length)[0];
  const hero = best ? {
    req: { id: best.r.id, title: best.r.title, cover: best.r.cover, amount: best.r.amount, unit: best.r.category === "photos" ? "photos" : best.r.category === "worn" ? "item" : "min", earn: euros(Math.round(best.r.dealCents * CREATOR_SHARE)), ages: `${best.r.ageMin} to ${best.r.ageMax}`, left: leftLabel(best.r.closesAt) },
    offers: best.o.slice(0, 5).map(({ o, u: c }) => ({
      handle: c.handle,
      look: c.avatar?.kind === "3d" ? `/av/${c.avatar.look}.webp` : c.avatar?.kind === "built" && c.avatar.svg ? svgSrc(c.avatar.svg) : null,
      rating: c.ratingCount ? (c.ratingSum / c.ratingCount).toFixed(1) : null,
      note: `made an offer · ${o.showsFace ? "face shown" : "no face"}`,
    })),
  } : null;
  const most = (["video", "photos", "voice", "custom"] as Category[]).map((k) => ({ k, s: stats[k] })).filter((x) => x.s).sort((a, b) => b.s!.n - a.s!.n);
  const tabs: [string | undefined, string][] = [[undefined, "Everything"], ["video", "Video"], ["photos", "Photos"], ["voice", "Voice"], ["custom", "Custom"]];

  return (<div className="wrap home">
    {welcome ? <div className="banner ok"><I n="check" /><div className="grow"><b>Welcome, {handle}.</b><div className="t-sm">Post your first request. Nothing is charged until you accept an offer.</div></div></div> : null}

    <section className="h-hero">
      <div className="h-hero-bg"><Cover cover="c20" /></div>
      <div className="h-hero-tx">
        <span className="h-kick">{greet()}, {handle}</span>
        <h1>Ask for it.<br />Someone makes it.</h1>
        <p>Say what you want and what it is worth. Creators who fit make an offer. You choose.</p>
        <div className="h-ask"><Ask /></div>
        <div className="h-ex">{EXAMPLES.map((e) => <Link key={e} href={parseAskHref(e)}>{e}</Link>)}</div>
        <div className="h-live"><span className="livedot" />{pulse.open} requests open now · {euros(pulse.paidCents)} paid to creators this week</div>
      </div>
      {hero ? <HeroLive req={hero.req} offers={hero.offers} /> : null}
    </section>

    {openMine || live ? (
      <div className="h-mine">
        {openMine ? <Link href={`/requests/${openMine.r.id}/offers`}><span className="livedot" /><span className="tx"><b>{openMine.offers} offers</b> on “{openMine.r.title}”</span><span className="go">Review <I n="right" c="sm" /></span></Link> : null}
        {live ? <Link href={`/deals/${live.d.id}`}><I n="lock" c="sm" /><span className="tx"><b>{live.r.title}</b> · {live.d.status === "held" ? "being made" : live.d.status === "reviewing" ? "being reviewed" : live.d.status === "delivered" ? "in your vault" : "under review"}</span><span className="go">Open <I n="right" c="sm" /></span></Link> : null}
      </div>) : null}

    <section className="h-sec">
      <div className="h-head"><div><span className="h-kick dark">Live board</span><h2>What people are asking for</h2></div>
        <nav className="h-tabs">{tabs.map(([k, l]) => <Link key={l} href={k ? `/?board=${k}` : "/"} scroll={false} className={cat === k ? "on" : ""}>{l}</Link>)}</nav></div>
      {feat ? (
        <div className="h-board">
          <Link href={`/requests/${feat.id}`} className="h-feat media">
            <Cover cover={feat.cover} frost />
            <div className="h-feat-in">
              <div className="h-feat-top"><span className="h-chip">New · {feat.offers} offers</span><span className="h-chip">{leftLabel(feat.closesAt)}</span></div>
              <div className="h-feat-num num">{feat.amount}<small>{feat.category === "photos" ? "PHOTOS" : feat.category === "voice" ? "MIN VOICE" : "MIN " + feat.category.toUpperCase()}</small></div>
              <div className="h-feat-b"><div><span className="h-kick">{CAT_LABEL[feat.category]} · {feat.who}, {feat.ageMin} to {feat.ageMax}</span><h3>{feat.title}</h3></div>
                <div className="h-earn"><span>Earn</span><b className="num">{euros(Math.round(feat.dealCents * CREATOR_SHARE))}</b></div></div>
            </div>
          </Link>
          {rest.slice(0, 6).map((r) => <RequestCard key={r.id} r={r} />)}
        </div>) : <div className="card empty"><b className="t-h3">Nothing in this category right now</b><Link href="/post" className="btn btn-primary">Be the first</Link></div>}
      <div className="h-more"><Link href="/for-you" className="btn btn-primary btn-lg">Open the full board <I n="right" c="sm" /></Link><Link href="/post" className="btn btn-secondary btn-lg">Post your own</Link></div>
    </section>

    <section className="h-sec">
      <div className="h-head"><div><span className="h-kick dark">This week</span><h2>Moods people are into</h2></div></div>
      <div className="h-drops">{DROPS.map((x) => { const n = stats[x.c]?.n ?? 0; return (
        <Link key={x.k} href={x.href} className="h-drop media"><Cover cover={x.cover} />
          <div className="h-drop-in"><span className="h-kick">{x.k}</span><h3>{x.t}</h3><p>{x.d}</p><span className="h-drop-cta">{n} open · start yours <I n="right" c="sm" /></span></div></Link>); })}</div>
    </section>

    <section className="h-promise">
      <div className="h-promise-head"><span className="h-kick">Our promises</span><h2>Private by design.<br />Safe by default.</h2><p>Everything that matters happens inside ByRequest, so everyone is protected from the first offer to the last view.</p></div>
      <div className="h-promise-grid">{PROMISES.map((x) => <div key={x.t} className="h-pr"><PromiseIcon name={x.i} /><b>{x.t}</b><p>{x.d}</p></div>)}</div>
    </section>

    <section className="h-sec">
      <div className="h-head"><div><span className="h-kick dark">Last chance</span><h2>Closing soon</h2></div><Link href="/for-you?tab=ending" className="h-link">See all <I n="right" c="sm" /></Link></div>
      <div className="rail">{soon.map((r) => <RequestCard key={r.id} r={r} />)}</div>
    </section>

    <section className="h-sec h-split">
      <div className="h-most"><span className="h-kick dark">Most wanted</span><h2>What sells right now</h2>
        <ol>{most.map((x, i) => (
          <li key={x.k}><span className="ix num">{String(i + 1).padStart(2, "0")}</span><div><b>{CAT_LABEL[x.k]}</b><span>{x.s!.n} open · typically {euros(x.s!.lo)} to {euros(x.s!.hi)}</span></div><Link href={`/?board=${x.k}`} scroll={false} aria-label={`Show ${CAT_LABEL[x.k]}`}><I n="right" /></Link></li>))}</ol></div>
      <div className="h-how"><span className="h-kick">How it works</span>
        <div className="h-step"><span className="num">1</span><div><b>Ask</b><p>Type, length, who, budget. Free to post.</p></div></div>
        <div className="h-step"><span className="num">2</span><div><b>Choose</b><p>Compare offers: face or not, vault time, rating.</p></div></div>
        <div className="h-step"><span className="num">3</span><div><b>Enjoy</b><p>Checked, reviewed, in your private vault.</p></div></div>
        <Link href="/post" className="btn btn-white btn-lg">Post a request</Link></div>
    </section>

    {creators.length ? (
      <section className="h-sec"><div className="h-head"><div><span className="h-kick dark">Open profiles</span><h2>Creators you can ask directly</h2></div><span className="t-sm muted">Others only show when they make you an offer</span></div>
        <div className="creators">{creators.map(({ u: c, p }) => (
          <Link key={c.id} href={`/c/${c.handle}`} className="cr"><div className="media avfill"><Av a={c.avatar} name={c.handle} size={300} square /><div className="top"><span className="badge glass">{p.showsFace ? "Face shown" : "No face"}</span></div></div>
            <div><div className="row"><b>{c.handle}</b><span className="t-sm"><Stars sum={c.ratingSum} count={c.ratingCount} /></span></div><div className="m">{c.ratingCount ? `${c.ratingCount} deals · ` : ""}from {euros(p.fromCents)}</div></div></Link>))}</div>
      </section>) : null}
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
