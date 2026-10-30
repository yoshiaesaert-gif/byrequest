import Link from "next/link";
import { getT } from "@/i18n/server";
import { requireCreator } from "@/server/auth";
import { access } from "@/server/onboarding";
import { earnings, isPeriod, PERIODS, eur } from "@/server/earnings";
import { euros } from "@/domain/rules";
import { EarnChart, Ledger, ExportMenu } from "./parts";
import { ReviewAsk } from "./review";
import { canReview, myReview } from "@/server/creatorreviews";

export const dynamic = "force-dynamic";

const CAT: Record<string, string> = { video: "Video", photos: "Photos", voice: "Voice", custom: "Custom", worn: "Worn items" };

function Delta({ a, b, t }: { a: number; b: number; t: (s: string, v?: Record<string, string | number>) => string }) {
  if (!b && !a) return <span className="ea-d flat">{t("No change")}</span>;
  if (!b) return <span className="ea-d up">{t("New")}</span>;
  const d = Math.round(((a - b) / b) * 100);
  return <span className={"ea-d " + (d > 0 ? "up" : d < 0 ? "down" : "flat")}>{d > 0 ? "▲" : d < 0 ? "▼" : ""} {Math.abs(d)}% <em>{t("vs previous period")}</em></span>;
}

/* A creator's money, at a glance and in depth: what came in, from where, what is on its way, and every line behind it. */
export default async function Earnings({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [{ t }, u, sp] = await Promise.all([getT(), requireCreator(), searchParams]);
  const p = isPeriod(sp.p) ? sp.p : "30d";
  const [e, a, may, mine] = await Promise.all([earnings(u.id, p), access(u.id), canReview(u.id), myReview(u.id)]);
  const label = t(PERIODS.find(([k]) => k === p)![1]);
  const maxCat = Math.max(1, ...e.categories.map((c) => c.cents));
  const maxDay = Math.max(1, ...e.weekday);
  const days = [t("Mon"), t("Tue"), t("Wed"), t("Thu"), t("Fri"), t("Sat"), t("Sun")];
  const src = [["deals", t("Deals"), e.deals], ["tips", t("Tips"), e.tips], ["invites", t("Invites"), e.invites]] as const;
  return (<div className="wrap ea">
    <div className="ea-h">
      <div><h1 className="t-h1">{t("Earnings")}</h1><p className="muted">{t("Everything you earned, where it came from and what is on its way.")}</p></div>
      <ExportMenu period={p} />
    </div>
    <nav className="ea-per" aria-label={t("Period")}>{PERIODS.map(([k, l]) => <Link key={k} href={`/earnings?p=${k}`} className={k === p ? "on" : ""} aria-current={k === p ? "page" : undefined} scroll={false}>{t(l)}</Link>)}</nav>

    <section className="ea-hero">
      <div className="ea-main"><span>{t("Earned")} · {label}</span><b className="num">{eur(e.total)}</b>{p !== "all" ? <Delta a={e.total} b={e.prevTotal} t={t} /> : null}</div>
      <div className="ea-side">
        <div><span>{t("On its way")}</span><b className="num">{euros(e.pending)}</b><small>{t("{n} deals in progress", { n: e.pendingRows.length })}</small></div>
        <div><span>{t("This month")}</span><b className="num">{euros(e.thisMonth)}</b><small>{t("since the 1st")}</small></div>
        {p === "all" ? <div><span>{t("Best {unit}", { unit: t(e.series.unit) })}</span><b className="num">{euros(e.best.total)}</b><small>{e.best.k || "–"}</small></div> : <div><span>{t("All time")}</span><b className="num">{euros(e.lifetime)}</b><small>{t("since you started")}</small></div>}
      </div>
      {e.onHold ? <Link href="/onboarding" className="ea-hold">{t("{amount} is waiting for your payout setup. Finish it to receive it.", { amount: eur(e.onHold) })}<span>→</span></Link> : !a.caps.receivePayouts ? <Link href="/onboarding" className="ea-hold">{t("Set up payouts to receive your earnings.")}<span>→</span></Link> : null}
    </section>

    {may && !mine ? <ReviewAsk done={false} /> : null}

    <div className="ea-kpis">
      <div className="ea-k"><span>{t("Deals completed")}</span><b className="num">{e.dealCount}</b>{p !== "all" ? <Delta a={e.dealCount} b={e.prevDealCount} t={t} /> : <small>{t("since you started")}</small>}</div>
      <div className="ea-k"><span>{t("Average per deal")}</span><b className="num">{euros(e.avgDeal)}</b><small>{t("Biggest: {amount}", { amount: euros(e.biggest) })}</small></div>
      <div className="ea-k"><span>{t("Tips received")}</span><b className="num">{euros(e.tips)}</b><small>{t("{n} tips", { n: e.tipCount })}</small></div>
      <div className="ea-k"><span>{t("Returning buyers")}</span><b className="num">{e.repeatBuyers}<em>/{e.buyers}</em></b><small>{t("bought from you more than once")}</small></div>
      <div className="ea-k"><span>{t("Your rating")}</span><b className="num">{e.rating.n ? e.rating.avg.toFixed(1) : "–"}<em> ★</em></b><small>{t("{n} ratings", { n: e.rating.n })}</small></div>
      <div className="ea-k"><span>{t("Delivered on time")}</span><b className="num">{e.onTime === null ? "–" : `${Math.round(e.onTime * 100)}%`}</b><small>{t("all your deliveries")}</small></div>
    </div>

    <section className="ea-card">
      <div className="ea-ch"><div><h2>{t("Earnings over time")}</h2><p>{e.best.total ? t("Best {unit}: {amount}", { unit: t(e.series.unit), amount: eur(e.best.total) }) : t("Nothing in this period yet")}</p></div>
        <div className="ea-leg"><span><i className="s-deals" />{t("Deals")}</span><span><i className="s-tips" />{t("Tips")}</span><span><i className="s-invites" />{t("Invites")}</span></div></div>
      <EarnChart points={e.series.points} unit={e.series.unit} />
    </section>

    <div className="ea-grid">
      <section className="ea-card"><h2>{t("Where it comes from")}</h2>
        <div className="ea-bars">{src.map(([k, l, c]) => <div key={k} className="ea-bar"><span><i className={"s-" + k} />{l}</span><div><i className={"s-" + k} style={{ width: `${e.total ? Math.max(c ? 3 : 0, (c / e.total) * 100) : 0}%` }} /></div><b className="num">{eur(c)}</b></div>)}</div>
        <div className="ea-sum"><span>{t("Total")}</span><b className="num">{eur(e.total)}</b></div>
      </section>
      <section className="ea-card"><h2>{t("By type of content")}</h2>
        {e.categories.length ? <div className="ea-bars">{e.categories.map((c) => <div key={c.k} className="ea-bar"><span>{t(CAT[c.k] ?? c.k)}</span><div><i className="s-deals" style={{ width: `${Math.max(3, (c.cents / maxCat) * 100)}%` }} /></div><b className="num">{eur(c.cents)}</b></div>)}</div> : <p className="ea-empty">{t("Your first deal shows up here.")}</p>}
      </section>
      <section className="ea-card"><h2>{t("Top buyers")}</h2>
        {e.topBuyers.length ? <ol className="ea-top">{e.topBuyers.map((b, i) => <li key={b.handle}><em>{i + 1}</em><span><b>{b.handle}</b><small>{t("{n} deals", { n: b.deals })}</small></span><b className="num">{eur(b.cents)}</b></li>)}</ol> : <p className="ea-empty">{t("Nobody bought in this period yet.")}</p>}
      </section>
      <section className="ea-card"><h2>{t("Your best days")}</h2>
        <div className="ea-week">{e.weekday.map((c, i) => <div key={i} title={eur(c)}><i style={{ height: `${Math.max(c ? 6 : 2, (c / maxDay) * 100)}%` }} className={c === maxDay && c ? "top" : ""} /><span>{days[i]}</span></div>)}</div>
        <p className="ea-note">{e.weekday.some((c) => c) ? t("Deals that paid out, by day of the week.") : t("Shows once deals pay out.")}</p>
      </section>
    </div>

    <section className="ea-card"><div className="ea-ch"><div><h2>{t("On its way")}</h2><p>{t("Deals you are working on or that are in their last check. They pay out automatically.")}</p></div><b className="num ea-big">{eur(e.pending)}</b></div>
      {e.pendingRows.length ? <div className="ea-pend">{e.pendingRows.map((r) => <Link key={r.id} href={`/deals/${r.id}`} className="ea-pr">
        <span className={"ea-st st-" + r.status}>{t(r.status === "held" ? "In progress" : r.status === "reviewing" ? "In review" : r.status === "delivered" ? "Delivered" : "Under review")}</span>
        <span className="ea-pt"><b>{r.title}</b><small>{r.buyer} · {r.status === "held" ? t("due {date}", { date: new Date(r.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }) : r.objectUntil ? t("pays out around {date}", { date: new Date(r.objectUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }) : t("in the last check")}</small></span>
        <b className="num">{eur(r.cents)}</b></Link>)}</div> : <p className="ea-empty">{t("Nothing on its way right now.")} <Link href="/for-you">{t("Find a request")}</Link></p>}
    </section>

    <Ledger lines={e.lines} />
  </div>);
}
