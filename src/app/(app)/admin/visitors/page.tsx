import Link from "next/link";
import { requireStaff } from "@/server/admin";
import { dashboard, visitDetail } from "@/server/analytics";
import { Chg, DayRace, Days, Spark } from "./charts";

export const dynamic = "force-dynamic";

const fmtDur = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
const time = (d: Date) => d.toLocaleString("nl-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
function Rank({ title, rows, note }: { title: string; rows: { k: string; n: number }[]; note?: string }) {
  const total = rows.reduce((t, r) => t + r.n, 0) || 1;
  return (<section className="dz-card dz-rank"><header><h3>{title}</h3>{note ? <span>{note}</span> : null}</header>
    {rows.length ? <ol>{rows.map((r) => <li key={r.k}><span className="dz-rk">{r.k}</span><span className="dz-rb"><i style={{ width: `${(r.n / rows[0].n) * 100}%` }} /></span><b>{r.n}</b><em>{Math.round((r.n / total) * 100)}%</em></li>)}</ol> : <p className="dz-empty">No data yet</p>}</section>);
}

export default async function Visitors({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  await requireStaff();
  const { v } = await searchParams;
  if (v) {
    const d = await visitDetail(v);
    if (!d) return <p className="muted">Visit not found.</p>;
    const x = d.v;
    return (<div className="wrap bo-page vz">
      <div className="bo-h"><Link href="/admin/visitors" className="back">All visitors</Link><h1>Visit {time(x.startedAt)}</h1></div>
      <div className="vz-facts card">{([["IP", x.ip ?? "?"], ["Location", [x.city, x.country].filter(Boolean).join(", ") || "Unknown"], ["Device", `${x.device} · ${x.browser} · ${x.os}`], ["Language", x.lang ?? "?"], ["Invite", x.refCode ? `${x.refCode}${d.inviter ? ` · from ${d.inviter}` : ""}` : "No invite"], ["Account", d.handle ?? "Not signed in"], ["Came from", x.referrer ?? "Direct"], ["Invite code", x.refCode ?? "None"], ["UTM", x.utm ? Object.entries(x.utm).map(([a, b]) => `${a}=${b}`).join(" ") : "None"], ["Landing", x.landing], ["Time on site", fmtDur(Math.round((x.lastAt.getTime() - x.startedAt.getTime()) / 1000))], ["Pages / clicks", `${x.pages} / ${x.clicks}`]] as const).map(([k, val]) => <div key={k}><span>{k}</span><b>{val}</b></div>)}</div>
      <div className="card"><b>What they did</b><ol className="vz-tl">{d.events.map((e) => <li key={e.id} className={e.kind}><time>{e.at.toLocaleTimeString("nl-BE", { timeZone: "Europe/Brussels" })}</time><span>{e.kind === "page" ? "Opened" : "Clicked"}</span><b>{e.kind === "page" ? e.path : e.label}</b>{e.kind === "click" ? <em>{e.path}</em> : null}</li>)}</ol></div>
      {d.others.length > 1 ? <div className="card"><b>Other visits from this browser</b>{d.others.map((o) => <Link key={o.id} className="vz-row link" href={`/admin/visitors?v=${o.id}`}><span>{time(o.startedAt)}</span><b>{o.pages} pages</b></Link>)}</div> : null}
    </div>);
  }
  const s = await dashboard();
  const hrs = (rows: { h: number; v: number }[]) => Array.from({ length: 24 }, (_, h) => rows.find((r) => r.h === h)?.v ?? 0);
  const su = Object.fromEntries(s.signupsDaily.map((r) => [r.d, r.n]));
  const spark = (f: (r: (typeof s.daily)[number]) => number) => s.daily.map((r) => ({ d: r.d, v: f(r) }));
  const pctFmt = (n: number) => `${Math.round(n * 100)}%`;
  const tiles: { l: string; v: string; a: number; b: number; c: number; inv?: boolean; sp: { d: string; v: number }[]; f?: "dur" | "pct" }[] = [
    { l: "Visits", v: String(s.today.visits), a: s.today.visits, b: s.yesterday.visits, c: s.lastWeek.visits, sp: spark((r) => r.v) },
    { l: "Page views", v: String(s.today.pages), a: s.today.pages, b: s.yesterday.pages, c: s.lastWeek.pages, sp: spark((r) => r.p) },
    { l: "Avg time on site", v: fmtDur(s.today.avgSec), a: s.today.avgSec, b: s.yesterday.avgSec, c: s.lastWeek.avgSec, sp: spark((r) => r.s), f: "dur" },
    { l: "Bounce rate", v: pctFmt(s.today.bounce), a: s.today.bounce, b: s.yesterday.bounce, c: s.lastWeek.bounce, inv: true, sp: spark((r) => r.b), f: "pct" },
    { l: "New accounts", v: String(s.today.signups), a: s.today.signups, b: s.yesterday.signups, c: s.lastWeek.signups, sp: s.daily.map((r) => ({ d: r.d, v: su[r.d] ?? 0 })) },
    { l: "Visits via invite", v: String(s.today.referred), a: s.today.referred, b: s.yesterday.referred, c: s.lastWeek.referred, sp: spark((r) => r.r) },
  ];
  const now = new Date().toLocaleString("en-GB", { timeZone: "Europe/Brussels", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return (<div className="wrap bo-page dz">
    <div className="dz-top"><div><h1>Visitors</h1><p>{now} · Brussels time · compared up to the same time</p></div><span className="dz-live"><i />{s.live} on the site now</span></div>

    <section className="dz-card dz-hero">
      <div className="dz-hero-n"><span className="dz-lbl">Visitors today</span><b className="num">{s.today.visitors}</b>
        <div className="dz-hero-c"><div><Chg a={s.today.visitors} b={s.yesterday.visitors} /><span>vs yesterday ({s.yesterday.visitors})</span></div><div><Chg a={s.today.visitors} b={s.lastWeek.visitors} /><span>vs last week ({s.lastWeek.visitors})</span></div></div>
        <div className="dz-hero-w"><span className="dz-lbl">Last 7 days</span><b className="num">{s.d7.visitors}</b><Chg a={s.d7.visitors} b={s.prev7.visitors} suffix=" vs 7 days before" /></div></div>
      <div className="dz-hero-g"><div className="dz-h"><h3>Visits so far</h3><span>Cumulative, per hour</span></div><DayRace today={hrs(s.hToday)} yesterday={hrs(s.hYesterday)} lastWeek={hrs(s.hLastWeek)} hour={s.hour} /></div>
    </section>

    <div className="dz-tiles">{tiles.map((x) => <section key={x.l} className="dz-card dz-tile"><span className="dz-lbl">{x.l}</span><b className="num">{x.v}</b>
      <div className="dz-tile-c"><Chg a={x.a} b={x.b} invert={x.inv} suffix=" d/d" /><Chg a={x.a} b={x.c} invert={x.inv} suffix=" w/w" /></div><Spark data={x.sp} kind={x.f} /></section>)}</div>

    <section className="dz-card"><div className="dz-h"><h3>Visitors per day</h3><span>Last 30 days · hover a day for details</span></div><Days rows={s.daily} signups={su} /></section>

    <div className="dz-ranks"><Rank title="Came from" note="7 days" rows={s.referrers} /><Rank title="Countries" note="7 days" rows={s.countries} /><Rank title="Cities" note="7 days" rows={s.cities} />
      <Rank title="Landing pages" note="7 days" rows={s.landings} /><Rank title="Pages opened" note="7 days" rows={s.pages} /><Rank title="Most clicked" note="7 days" rows={s.clicks} />
      <Rank title="Devices" note="7 days" rows={s.devices} /><Rank title="Browser and system" note="7 days" rows={s.browsers} /><Rank title="Invite codes" note="7 days" rows={s.codes} /></div>

    <section className="dz-card"><div className="dz-h"><h3>Latest visits</h3><span>Click a visit to see every page and click</span></div><div className="crm-wrap dz-tbl"><table className="crm-t"><thead><tr><th><button type="button">Last seen</button></th><th><button type="button">Location</button></th><th><button type="button">IP</button></th><th><button type="button">Device</button></th><th><button type="button">Account</button></th><th><button type="button">Source</button></th><th><button type="button">Landing</button></th><th className="r"><button type="button">Pages</button></th><th className="r"><button type="button">Time</button></th></tr></thead><tbody>
      {s.recent.map(({ v: x, handle, internal, inviter }) => <tr key={x.id}><td><Link className="crm-acc" href={`/admin/visitors?v=${x.id}`}>{time(x.lastAt)}</Link></td><td>{[x.city, x.country].filter(Boolean).join(", ") || "Unknown"}</td><td className="mono crm-mail">{x.ip}</td><td>{x.device} · {x.browser}</td>
        <td>{handle ? <>{handle} <span className={"crm-pill" + (internal ? "" : " s-external")}>{internal ? "Internal" : "External"}</span></> : <span className="crm-mail">Guest</span>}</td><td>{x.refCode ? `Invite ${x.refCode}${inviter ? ` · from ${inviter}` : ""}` : x.referrer ?? "Direct"}</td><td className="crm-mail">{x.landing}</td><td className="r num">{x.pages}</td><td className="r num">{fmtDur(Math.round((x.lastAt.getTime() - x.startedAt.getTime()) / 1000))}</td></tr>)}
    </tbody></table>{!s.recent.length ? <p className="crm-empty">No visits yet. Every visitor is counted, without cookies.</p> : null}</div></section>
  </div>);
}
