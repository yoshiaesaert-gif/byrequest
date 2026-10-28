import Link from "next/link";
import { THEMES, shuffled } from "@/content/themes";
import ScrollRow from "@/components/scroll-row";
import Orbit from "@/components/orbit";
import HowItWorks from "@/components/how-it-works";
import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import * as q from "@/server/queries";
import { access } from "@/server/onboarding";
import { Av, BuyerLine, Cover, I, RequestCard, Stars, leftLabel, svgSrc } from "@/components/ui";
import HeroLive from "@/components/hero-live";
import { getT } from "@/i18n/server";
import { localize, textsIn } from "@/server/translate";
import Ask from "@/components/ask";
import { parseAsk as parseAskHref } from "@/components/ask-parse";
import { PromiseIcon } from "@/components/promise-icons";
import Tips from "@/components/tips";
import { tipsFor } from "@/content/tips";
import { CAT_LABEL, CREATOR_SHARE, euros, amountLabel, type Category } from "@/domain/rules";

const greet = () => { const h = new Date().getHours(); return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string; board?: string }> }) {
  const u = await requireUser();
  const sell = u.isCreator && (await cookies()).get("brq_mode")?.value === "sell";
  const sp = await searchParams;
  return sell ? <CreatorHome userId={u.id} handle={u.handle} board={sp.board} /> : <BuyerHome userId={u.id} handle={u.handle} welcome={!!sp.welcome} creator={u.isCreator} />;
}

const PROMISES = [
  { i: "held", t: "Money held until it matches", d: "Our payment partner holds it. You pay only for what was agreed, checked and reviewed." },
  { i: "e2e", t: "Chats nobody else can read", d: "End to end encrypted on your device. Not even ByRequest can open them." },
  { i: "vault", t: "A vault that stays yours", d: "No download, no forwarding, your name on every view." },
  { i: "adults", t: "Verified adults only", d: "Every creator verifies ID and age once. Their legal name stays private." },
  { i: "billing", t: "Discreet everywhere", d: "BRQ DIGITAL on your statement, neutral alerts, quick hide on every screen." },
  { i: "fair", t: "Fair when it goes wrong", d: "24 hours to object. A person decides. Cheating costs more than it earns." },
] as const;
const PROMISES_CREATOR = [
  { i: "held", t: "The money is there before you start", d: "The buyer pays when choosing you. The payment partner holds it and pays you after the check." },
  { i: "billing", t: "Your name stays yours", d: "Buyers only see your username and avatar. Your legal name and ID are never shown." },
  { i: "adults", t: "Verified buyers", d: "Every buyer confirms their age. You see their stars and deals, never who they are." },
  { i: "e2e", t: "Chats nobody else can read", d: "End to end encrypted. Contact details never need to be shared." },
  { i: "vault", t: "Your work is protected", d: "No download, no forwarding, the buyer's name as watermark on every view." },
  { i: "fair", t: "Fair when it goes wrong", d: "A person decides on objections. If your delivery matches the offer, you are paid." },
] as const;
const EXAMPLES = ["10 min shower video", "Good night voice note", "Post workout photo set", "Fit check, 5 photos"];

async function BuyerHome({ userId, handle, welcome, creator }: { userId: string; handle: string; welcome: boolean; creator: boolean }) {
  const hideHow = (await cookies()).get("brq_hwb")?.value === "hide";
  const [mine, myDeals, pulse, rawTop, rawBoard, creators, stats] = await Promise.all([
    q.myRequests(userId), q.myDeals(userId), q.pulse(), q.feed({ viewerId: userId, limit: 6 }), q.feed({ viewerId: userId, tab: "new", limit: 20 }),
    q.publicCreators(18), q.categoryStats(),
  ]);
  const { t, locale } = await getT();
  const [top, boardItems] = await Promise.all([localize(rawTop, locale), localize(rawBoard, locale)]);
  const openMine = mine.find((m) => m.r.status === "open");
  const L = await textsIn([...mine.map((m) => m.r.title), ...myDeals.map((d) => d.r.title)], locale);
  const live = myDeals.find((d) => d.d.buyerId === userId && ["held", "reviewing", "delivered", "disputed"].includes(d.d.status));
  // Every request shows once on the page: hero, board and closing soon never repeat each other.
  const fan = top.filter((r) => !r.mine).slice(0, 3);
  const shown = new Set(fan.map((r) => r.id));
  const items = boardItems.filter((r) => !r.mine && !shown.has(r.id)).slice(0, 6);
  // Hero: the open request with the most offers from creators with an open profile. Offer only
  // creators stay hidden, because they only show to the buyer they made an offer to.
  const cands = await Promise.all(fan.map(async (r) => ({ r, o: (await q.offersFor(r.id)).filter((x) => x.p.visibility === "public") })));
  for (const c of cands) { const d3 = c.o.filter((x) => x.u.avatar?.kind === "3d"); if (d3.length >= 2) c.o = d3; }
  const best = cands.sort((a, b) => b.o.length - a.o.length)[0];
  const hero = best ? {
    req: { id: best.r.id, title: best.r.title, cover: best.r.cover, amount: best.r.amount, unit: best.r.category === "photos" ? "photos" : best.r.category === "worn" ? "item" : "min", earn: euros(Math.round(best.r.dealCents * CREATOR_SHARE)), ages: t("{a} to {b}", { a: best.r.ageMin, b: best.r.ageMax }), left: leftLabel(best.r.closesAt, t), unitLabel: t(best.r.category === "photos" ? "photos" : best.r.category === "worn" ? "item" : "min"), earnLabel: t("Earn"), offerWord: t("offer"), offersWord: t("offers") },
    offers: best.o.slice(0, 5).map(({ o, u: c }) => ({
      handle: c.handle,
      look: c.avatar?.kind === "3d" ? `/av/${c.avatar.look}.webp` : c.avatar?.kind === "built" && c.avatar.svg ? svgSrc(c.avatar.svg) : null,
      rating: c.ratingCount ? (c.ratingSum / c.ratingCount).toFixed(1) : null,
      note: `${t("made an offer")} · ${o.showsFace ? t("face shown") : t("no face")}`,
    })),
  } : null;
  // Alpha Gods stays on top, the other themes follow by how many open requests fit them.
  const [counts, topPaid, totals, verified] = await Promise.all([q.themeCounts(), q.topBudgets(5), q.boardTotals(), q.verifiedCreators()]);
  const TL = await textsIn(topPaid.map((x) => x.title), locale);
  const hot = shuffled(THEMES).map((x) => ({ ...x, n: counts[x.k] ?? 0 }));

  return (<div className="wrap home">
    {welcome ? <div className="banner ok"><I n="check" /><div className="grow"><b>{t("Welcome, {name}.", { name: handle })}</b><div className="t-sm">{t("Post your first request. Your payment stays safely held until delivery.")}</div></div></div> : null}

    <section className="h-hero">
      <div className="h-hero-bg"><Cover cover="c20" /></div>
      <div className="h-hero-tx">
        <span className="h-kick">{t(greet())}, {handle}</span>
        <h1>{t("Ask for it.")}<br />{t("Someone makes it.")}</h1>
        <p>{t("Say what you want and what it is worth. Creators who fit make an offer. You choose.")}</p>
        <div className="h-ask"><Ask /></div>
        <div className="h-ex">{EXAMPLES.map((e) => <Link key={e} href={parseAskHref(e)}>{t(e)}</Link>)}</div>
        <div className="h-cta"><Link href="/post" className="btn btn-brand btn-lg"><I n="plus" c="sm" />{t("Post a request")}</Link><span>{t("You pay when you post. Not approved, or nobody applies? Full refund.")}</span></div>
        <div className="h-live"><span className="livedot" />{t("{n} requests open now", { n: pulse.open })}{pulse.paidCents ? ` · ${t("{amount} paid to creators this week", { amount: euros(pulse.paidCents) })}` : ""}</div>
      </div>
      {hero ? <HeroLive req={hero.req} offers={hero.offers} /> : null}
    </section>

    {openMine || live ? (
      <div className="h-mine">
        {openMine ? <Link href={`/requests/${openMine.r.id}/offers`}><span className="livedot" /><span className="tx"><b>{t("{n} offers", { n: openMine.offers })}</b> {t("on")} “{L(openMine.r.title)}”</span><span className="go">{t("Review")} <I n="right" c="sm" /></span></Link> : null}
        {live ? <Link href={`/deals/${live.d.id}`}><I n="lock" c="sm" /><span className="tx"><b>{L(live.r.title)}</b> · {t(live.d.status === "held" ? "being made" : live.d.status === "reviewing" ? "being reviewed" : live.d.status === "delivered" ? "in your vault" : "under review")}</span><span className="go">{t("Open")} <I n="right" c="sm" /></span></Link> : null}
      </div>) : null}

    <HowItWorks hidden={hideHow && !welcome} variant="buy" autoOpen={welcome} />

    <section className="h-sec">
      <div className="h-head"><div><span className="h-kick dark">{t("Inspiration")}</span><h2>{t("What others are asking for")}</h2></div><span className="t-sm muted">{t("Open one and post a similar request in one tap.")}</span></div>
      <div className="h-inspo">{items.slice(0, 6).map((r) => <RequestCard key={r.id} r={r} t={t} budget />)}</div>
    </section>

    <Tips tips={tipsFor("buy", locale)} kick={t("Tips and tricks")} title={t("Get the most out of your request")} />


    <section className="h-sec">
      <div className="h-head"><div><span className="h-kick dark">{t("Hot right now")}</span><h2>{t("Moods people are into this week")}</h2></div></div>
      <ScrollRow className="h-drops">{hot.map((x) => (
        <Link key={x.k} href={`/post?c=${x.cat}&amount=${x.amount}&budget=${x.budget}&title=${encodeURIComponent(t(x.example))}&d=${encodeURIComponent(t(x.details))}`} className="h-drop media"><Cover cover={x.cover} />
          <div className="h-drop-in"><span className="h-kick">{t(x.title)}</span><h3>{t(x.line)}</h3><p>{t(x.sub)}</p><span className="h-drop-cta">{x.n ? t("{n} open · start yours", { n: x.n }) : t("Start yours")} <I n="right" c="sm" /></span></div></Link>))}</ScrollRow>
    </section>

    <Orbit count={verified} t={t} />

    <section className="h-promise">
      <div className="h-promise-head"><span className="h-kick">{t("Our promises")}</span><h2>{t("Private by design.")}<br />{t("Safe by default.")}</h2><p>{t("Everything that matters happens inside ByRequest, so everyone is protected from the first offer to the last view.")}</p></div>
      <div className="h-promise-grid">{PROMISES.map((x) => <div key={x.t} className="h-pr"><PromiseIcon name={x.i} /><b>{t(x.t)}</b><p>{t(x.d)}</p></div>)}</div>
    </section>


    <section className="h-sec h-split">
      <div className="h-most"><span className="h-kick dark">{t("Top budgets")}</span><h2>{t("What others pay right now")}</h2>
        <ol>{topPaid.map((x, i) => (
          <li key={x.id}><span className="ix num">{String(i + 1).padStart(2, "0")}</span><div><b>{TL(x.title)}</b><span>{t(CAT_LABEL[x.category])} · {amountLabel(x.category, x.amount, t)}</span></div><b className="h-top-eur num">{euros(x.dealCents)}</b><Link href={`/requests/${x.id}`} aria-label={TL(x.title)}><I n="right" /></Link></li>))}</ol></div>
      <div className="h-how"><span className="h-kick">{t("How it works")}</span>
        <div className="h-step"><span className="num">1</span><div><b>{t("Ask")}</b><p>{t("Type, length, who, budget. Paid when posted, held until delivery.")}</p></div></div>
        <div className="h-step"><span className="num">2</span><div><b>{t("Choose")}</b><p>{t("Compare candidates: face or not, vault time, rating.")}</p></div></div>
        <div className="h-step"><span className="num">3</span><div><b>{t("Enjoy")}</b><p>{t("Checked, reviewed, in your private vault.")}</p></div></div>
        <div className="h-stats"><div><b className="num">{totals.open}</b><span>{t("open requests now")}</span></div><div><b className="num">{euros(totals.cents)}</b><span>{t("in budgets on the board")}</span></div></div>
        <Link href="/post" className="btn btn-white btn-lg">{t("Post a request")}</Link></div>
    </section>

    {creators.length ? (
      <section className="h-sec"><div className="h-head"><div><span className="h-kick dark">{t("Open profiles")}</span><h2>{t("Creators you can ask directly")}</h2></div><span className="t-sm muted">{t("Others only show when they make you an offer")}</span></div>
        <div className="creators">{shuffled(creators).map(({ u: c, p }) => (
          <Link key={c.id} href={`/c/${c.handle}`} className="cr"><div className="media avfill"><Av a={c.avatar} name={c.handle} size={300} square /><div className="top"><span className="badge glass">{p.showsFace ? t("Face shown") : t("No face")}</span></div></div>
            <div><div className="row"><b>{c.handle}</b><span className="t-sm"><Stars sum={c.ratingSum} count={c.ratingCount} t={t} /></span></div><div className="m">{c.ratingCount ? `${t("{n} deals", { n: c.ratingCount })} · ` : ""}{t("from {amount}", { amount: euros(p.fromCents) })}</div></div></Link>))}</div>
      </section>) : null}

    {!creator ? <section className="h-cross">
      <div><span className="h-kick">{t("The other side")}</span><h2>{t("Rather earn yourself?")}</h2><p>{t("Pick requests you like, make them in your own time and get paid. No followers, no profile to keep up, your name never shown.")}</p></div>
      <Link href="/earn" className="btn btn-white btn-lg">{t("See how earning works")}</Link>
    </section> : null}
  </div>);
}

async function CreatorHome({ userId, handle, board }: { userId: string; handle: string; board?: string }) {
  const hideHow = (await cookies()).get("brq_hw")?.value === "hide";
  const cat = ["video", "photos", "voice", "custom"].includes(board ?? "") ? board : undefined;
  const [a, earn, fit, albums, offers, rawBoard, rawEnding, stats] = await Promise.all([access(userId), q.creatorEarnings(userId), q.feed({ viewerId: userId, limit: 6 }), q.albumsForCreator(userId), q.myOffers(userId),
    q.feed({ viewerId: userId, tab: "new", category: cat, limit: 20 }), q.feed({ viewerId: userId, tab: "ending", limit: 16 }), q.categoryStats()]);
  const pts = earn.weeks.length ? earn.weeks.map((w) => w.c) : [0];
  const mx = Math.max(...pts, 1), W = 600, H = 80;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${((i * W) / Math.max(pts.length - 1, 1)).toFixed(1)} ${(H - 6 - (v / mx) * (H - 16)).toFixed(1)}`).join(" ");
  const pendingOffers = offers.filter((o) => o.o.status === "pending").length;
  const { t, locale } = await getT();
  const [boardItems, ending] = await Promise.all([localize(rawBoard, locale), localize(rawEnding, locale)]);
  // Every request shows once: board first, then closing soon without repeats.
  const items = boardItems.filter((r) => !r.mine).slice(0, 7);
  const shown = new Set(items.map((r) => r.id));
  const soon = ending.filter((r) => !r.mine && !shown.has(r.id));
  const [feat, ...rest] = items;
  // Alpha Gods stays on top, the other themes follow by how many open requests fit them.
  const [counts, topPaid, totals] = await Promise.all([q.themeCounts(), q.topBudgets(5), q.boardTotals()]);
  const TL = await textsIn(topPaid.map((x) => x.title), locale);
  const hot = shuffled(THEMES).map((x) => ({ ...x, n: counts[x.k] ?? 0 }));
  const tabs: [string | undefined, string][] = [[undefined, t("Everything")], ["video", t("Video")], ["photos", t("Photos")], ["voice", t("Voice")], ["custom", t("Custom")]];
  return (<div className="wrap">
    {a.status === "active"
      ? <div className="banner ok"><I n="check" /><div className="grow"><b>{t("You’re ready to earn.")}</b><div className="t-sm">{t("Identity, agreement and payouts are approved.")}</div></div></div>
      : a.status === "suspended" ? <div className="banner warn"><I n="alert" /><div className="grow"><b>{t("Your creator account is suspended.")}</b><div className="t-sm">{a.missing.map((m) => t(m)).join(" · ")}</div></div></div>
      : <section className="cs">
          <div className="cs-tx"><span className="h-kick">{t("Your setup")}</span><h2>{a.status === "pending_verification" ? t("Almost there: we are checking your details.") : t("Three steps to your first earnings")}</h2>
            <p>{t("Verify once, privately. Your legal name and ID are never shown. Until then you can already look around and prepare your profile.")}</p>
            {a.status !== "pending_verification" ? <Link href="/onboarding" className="btn btn-brand btn-lg">{t("Continue setup")}</Link> : null}</div>
          <ol className="cs-steps">{([["identity", "Verify your identity", "ID and a quick selfie, about 3 minutes"], ["agreement", "Accept the creator agreement", "What you make, what you earn, your rights"], ["payout", "Add your payout account", "Where the money lands"]] as const).map(([k, l, d], i) => {
            const st = a.areas[k]; const done = st === "approved"; const wait = st === "pending";
            return <li key={k} className={done ? "done" : wait ? "wait" : ""}><span className="cs-n">{done ? "✓" : i + 1}</span><div><b>{t(l)}</b><span>{done ? t("Done") : wait ? t("Being checked") : t(d)}</span></div></li>; })}</ol>
        </section>}

    <div className="hello"><div><span className="eyebrow">{t("Hi {name}", { name: handle })}</span><h1 className="t-display" style={{ marginTop: 10 }}>{t("{n} requests are open now", { n: fit.length })}</h1></div><Link href="/for-you" className="btn btn-primary"><I n="foryou" c="sm" />{t("Browse requests")}</Link></div>

    <div className="earn-hero">
      <div className="card earn-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><div><span className="eyebrow">{t("Earned this month")}</span><div className="big num" style={{ marginTop: 10 }}>{euros(earn.monthCents)}</div></div>{earn.heldCents ? <span className="badge amber">{t("{amount} waiting for payout setup", { amount: euros(earn.heldCents) })}</span> : null}</div>
        <svg className="spark" viewBox="0 0 600 80" preserveAspectRatio="none" role="img" aria-label="Weekly earnings, last 12 weeks"><path d={`${d} L600 80 L0 80 Z`} fill="var(--brand-soft)" /><path d={d} fill="none" stroke="var(--brand)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>
        <div className="kv"><div><b className="num">{euros(earn.pendingCents)}</b><span>{t("In progress")}</span></div><div><b>{a.caps.receivePayouts ? t("After delivery") : t("Not yet")}</b><span>{t("Next payout")}</span></div><div><b className="num">{pendingOffers}</b><span>{t("Open offers")}</span></div></div>
      </div>
      <div className="card terms"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 className="t-h3">{t("Preview requests")}</h3><Link href="/studio" className="btn btn-ghost btn-sm">{t("Studio")}</Link></div>
        <p className="t-sm muted">{t("Buyers who are choosing can ask for a view once preview. You decide.")}</p>
        {albums.length ? albums.slice(0, 3).map((x) => <div key={x.a.id} className="term"><span className="muted">{x.buyer} · {x.a.kind}</span><Link href="/studio" className="btn btn-secondary btn-sm">{t("Answer")}</Link></div>) : <div className="term"><span className="muted">{t("No requests right now")}</span><b>{t("All clear")}</b></div>}
      </div>
    </div>

    <HowItWorks hidden={hideHow} variant="earn" />

    <section className="h-sec">
      <div className="h-head"><div><span className="h-kick dark">{t("Live board")}</span><h2>{t("What people are asking for")}</h2></div>
        <nav className="h-tabs">{tabs.map(([k, l]) => <Link key={l} href={k ? `/?board=${k}` : "/"} scroll={false} className={cat === k ? "on" : ""}>{l}</Link>)}</nav></div>
      {feat ? (
        <div className="h-board">
          <Link href={`/requests/${feat.id}`} className="h-feat media">
            <Cover cover={feat.cover} frost />
            <div className="h-feat-in">
              <div className="h-feat-top"><span className="h-chip">{t("New")} · {t("{n} offers", { n: feat.offers })}</span><span className="h-chip">{leftLabel(feat.closesAt, t)}</span></div>
              <div className="h-feat-num num">{feat.amount}<small>{t(feat.category === "photos" ? "PHOTOS" : feat.category === "voice" ? "MIN VOICE" : feat.category === "custom" ? "MIN CUSTOM" : "MIN VIDEO")}</small></div>
              <div className="h-feat-b"><div><span className="h-kick">{t(CAT_LABEL[feat.category])} · {t(feat.who)}, {t("{a} to {b}", { a: feat.ageMin, b: feat.ageMax })}</span><h3>{feat.title}</h3><BuyerLine b={feat.buyer} t={t} light />{feat.house ? <span className="by-brq" style={{ color: "rgba(255,255,255,.7)" }}>{t("by ByRequest")}</span> : null}</div>
                <div className="h-earn"><span>{t("Budget")}</span><b className="num">{euros(feat.dealCents)}</b><small>{t("You get {amount}", { amount: euros(Math.round(feat.dealCents * CREATOR_SHARE)) })}</small></div></div>
            </div>
          </Link>
          {rest.slice(0, 6).map((r) => <RequestCard key={r.id} r={r} t={t} />)}
        </div>) : <div className="card empty"><b className="t-h3">{t("Nothing in this category right now")}</b><Link href="/post" className="btn btn-primary">{t("Be the first")}</Link></div>}
      <div className="h-more"><Link href="/for-you" className="btn btn-primary btn-lg">{t("Open the full board")} <I n="right" c="sm" /></Link><Link href="/post" className="btn btn-secondary btn-lg">{t("Post your own")}</Link></div>
    </section>

    <section className="h-sec">
      <div className="h-head"><div><span className="h-kick dark">{t("Hot right now")}</span><h2>{t("Moods people are into")}</h2></div></div>
      <ScrollRow className="h-drops">{hot.map((x) => (
        <Link key={x.k} href={`/for-you?theme=${x.k}`} className="h-drop media"><Cover cover={x.cover} />
          <div className="h-drop-in"><span className="h-kick">{t(x.title)}</span><h3>{t(x.line)}</h3><p>{t(x.sub)}</p><span className="h-drop-cta">{x.n ? t("{n} open · see them", { n: x.n }) : t("See the board")} <I n="right" c="sm" /></span></div></Link>))}</ScrollRow>
    </section>

    <section className="h-sec">
      <div className="h-head"><div><span className="h-kick dark">{t("Last chance")}</span><h2>{t("Closing soon")}</h2></div><Link href="/for-you?tab=ending" className="h-link">{t("See all")} <I n="right" c="sm" /></Link></div>
      <div className="rail">{soon.map((r) => <RequestCard key={r.id} r={r} t={t} />)}</div>
    </section>

    <Tips tips={tipsFor("earn", locale)} kick={t("Tips and tricks")} title={t("Deliver work buyers love")} />

    <section className="h-promise">
      <div className="h-promise-head"><span className="h-kick">{t("Our promises")}</span><h2>{t("Paid for sure.")}<br />{t("Private by default.")}</h2><p>{t("You choose what you make. We make sure you get paid and stay anonymous.")}</p></div>
      <div className="h-promise-grid">{PROMISES_CREATOR.map((x) => <div key={x.t} className="h-pr"><PromiseIcon name={x.i} /><b>{t(x.t)}</b><p>{t(x.d)}</p></div>)}</div>
    </section>

    <section className="h-sec h-split">
      <div className="h-most"><span className="h-kick dark">{t("Top budgets")}</span><h2>{t("Best paid requests right now")}</h2>
        <ol>{topPaid.map((x, i) => (
          <li key={x.id}><span className="ix num">{String(i + 1).padStart(2, "0")}</span><div><b>{TL(x.title)}</b><span>{t(CAT_LABEL[x.category])} · {amountLabel(x.category, x.amount, t)} · {t("You get {amount}", { amount: euros(Math.round(x.dealCents * CREATOR_SHARE)) })}</span></div><b className="h-top-eur num">{euros(x.dealCents)}</b><Link href={`/requests/${x.id}#offer`} aria-label={TL(x.title)}><I n="right" /></Link></li>))}</ol></div>
      <div className="h-how"><span className="h-kick">{t("How it works")}</span>
        <div className="h-step"><span className="num">1</span><div><b>{t("Pick")}</b><p>{t("Only requests you like. The amount is on it.")}</p></div></div>
        <div className="h-step"><span className="num">2</span><div><b>{t("Make")}</b><p>{t("In your own time, face or not.")}</p></div></div>
        <div className="h-step"><span className="num">3</span><div><b>{t("Get paid")}</b><p>{t("After the check, straight to your account.")}</p></div></div>
        <div className="h-stats"><div><b className="num">{totals.open}</b><span>{t("open requests now")}</span></div><div><b className="num">{euros(totals.cents)}</b><span>{t("in budgets on the board")}</span></div></div>
        <Link href="/for-you" className="btn btn-white btn-lg">{t("Open the board")}</Link></div>
    </section>
  </div>);
}
