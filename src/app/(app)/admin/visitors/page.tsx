import Link from "next/link";
import { requireStaff } from "@/server/admin";
import { dashboard, visitDetail } from "@/server/analytics";

export const dynamic = "force-dynamic";

const fmtDur = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
const time = (d: Date) => d.toLocaleString("nl-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
function Delta({ now, then, label, invert }: { now: number; then: number; label: string; invert?: boolean }) {
  if (!then) return <span className="vz-d">{label}: {now ? "new" : "n/a"}</span>;
  const p = Math.round(((now - then) / then) * 100);
  const good = invert ? p <= 0 : p >= 0;
  return <span className={"vz-d " + (p === 0 ? "" : good ? "up" : "down")}>{p > 0 ? "▲" : p < 0 ? "▼" : "="} {Math.abs(p)}% {label}</span>;
}
function Lines({ series }: { series: { name: string; color: string; pts: number[]; dash?: boolean }[] }) {
  const W = 720, H = 180, max = Math.max(1, ...series.flatMap((s) => s.pts));
  const path = (pts: number[]) => pts.map((v, i) => `${i ? "L" : "M"}${((i / 23) * W).toFixed(1)} ${(H - 8 - (v / max) * (H - 24)).toFixed(1)}`).join(" ");
  return (<div><svg viewBox={`0 0 ${W} ${H + 18}`} className="vz-svg" role="img" aria-label="Visits per hour">
    {[0, 0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={H - 8 - f * (H - 24)} y2={H - 8 - f * (H - 24)} className="vz-grid" />)}
    {series.map((s) => <path key={s.name} d={path(s.pts)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash ? "5 5" : undefined} vectorEffect="non-scaling-stroke" />)}
    {[0, 6, 12, 18, 23].map((h) => <text key={h} x={(h / 23) * W} y={H + 14} className="vz-ax" textAnchor={h === 0 ? "start" : h === 23 ? "end" : "middle"}>{h}:00</text>)}
    <text x="0" y="12" className="vz-ax">{max}</text></svg>
    <div className="vz-leg">{series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div></div>);
}
function Bars({ rows }: { rows: { d: string; v: number; u: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  return <div className="vz-bars">{rows.map((r) => <div key={r.d} title={`${r.d}: ${r.v} visits, ${r.u} visitors`}><i style={{ height: `${(r.v / max) * 100}%` }} /><span>{r.d.slice(8)}</span></div>)}</div>;
}
function Top({ title, rows }: { title: string; rows: { k: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (<div className="card vz-top"><b>{title}</b>{rows.length ? rows.map((r) => <div key={r.k} className="vz-row"><i style={{ width: `${(r.n / max) * 100}%` }} /><span>{r.k}</span><b>{r.n}</b></div>) : <span className="muted t-sm">No data yet</span>}</div>);
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
      <div className="vz-facts card">{([["IP", x.ip ?? "?"], ["Location", [x.city, x.country].filter(Boolean).join(", ") || "Unknown"], ["Device", `${x.device} · ${x.browser} · ${x.os}`], ["Language", x.lang ?? "?"], ["Account", d.handle ?? "Not signed in"], ["Came from", x.referrer ?? "Direct"], ["Invite code", x.refCode ?? "None"], ["UTM", x.utm ? Object.entries(x.utm).map(([a, b]) => `${a}=${b}`).join(" ") : "None"], ["Landing", x.landing], ["Time on site", fmtDur(Math.round((x.lastAt.getTime() - x.startedAt.getTime()) / 1000))], ["Pages / clicks", `${x.pages} / ${x.clicks}`]] as const).map(([k, val]) => <div key={k}><span>{k}</span><b>{val}</b></div>)}</div>
      <div className="card"><b>What they did</b><ol className="vz-tl">{d.events.map((e) => <li key={e.id} className={e.kind}><time>{e.at.toLocaleTimeString("nl-BE", { timeZone: "Europe/Brussels" })}</time><span>{e.kind === "page" ? "Opened" : "Clicked"}</span><b>{e.kind === "page" ? e.path : e.label}</b>{e.kind === "click" ? <em>{e.path}</em> : null}</li>)}</ol></div>
      {d.others.length > 1 ? <div className="card"><b>Other visits from this browser</b>{d.others.map((o) => <Link key={o.id} className="vz-row link" href={`/admin/visitors?v=${o.id}`}><span>{time(o.startedAt)}</span><b>{o.pages} pages</b></Link>)}</div> : null}
    </div>);
  }
  const s = await dashboard();
  const hrs = (rows: { h: number; n: number }[]) => Array.from({ length: 24 }, (_, h) => rows.find((r) => r.h === h)?.n ?? 0);
  const K: [string, keyof typeof s.today, (n: number) => string, boolean?][] = [["Visitors", "visitors", String], ["Visits", "visits", String], ["Page views", "pages", String], ["Clicks", "clicks", String], ["Avg time on site", "avgSec", fmtDur], ["Bounce rate", "bounce", (n) => `${Math.round(n * 100)}%`, true], ["Via invite", "referred", String], ["New external accounts", "signups", String]];
  return (<div className="wrap bo-page vz">
    <div className="bo-h vz-head"><div><h1>Visitors</h1><p>Today compared with yesterday and the same day last week. Times in Brussels.</p></div><span className="vz-live"><i />{s.live} on the site now</span></div>
    <div className="vz-kpis">{K.map(([l, k, f, inv]) => <div key={l} className="card vz-kpi"><span>{l}</span><b>{f(s.today[k] as number)}</b><Delta now={s.today[k] as number} then={s.yesterday[k] as number} label="vs yesterday" invert={inv} /><Delta now={s.today[k] as number} then={s.lastWeek[k] as number} label="vs last week" invert={inv} /></div>)}</div>
    <div className="vz-2"><div className="card"><b>Visits per hour</b><Lines series={[{ name: "Today", color: "#4434E6", pts: hrs(s.hToday) }, { name: "Yesterday", color: "#9A9EA6", pts: hrs(s.hYesterday) }, { name: "Same day last week", color: "#E0A100", pts: hrs(s.hLastWeek), dash: true }]} /></div>
      <div className="card"><b>Last 7 days vs the 7 before</b><div className="vz-cmp">{K.map(([l, k, f, inv]) => <div key={l}><span>{l}</span><b>{f(s.d7[k] as number)}</b><Delta now={s.d7[k] as number} then={s.prev7[k] as number} label="" invert={inv} /></div>)}</div></div></div>
    <div className="card"><b>Visits per day, last 30 days</b><Bars rows={s.daily} /></div>
    <div className="vz-grid3"><Top title="Pages opened (7 days)" rows={s.pages} /><Top title="Clicked (7 days)" rows={s.clicks} /><Top title="Landing pages" rows={s.landings} /><Top title="Countries" rows={s.countries} /><Top title="Cities" rows={s.cities} /><Top title="Came from" rows={s.referrers} /><Top title="Invite codes" rows={s.codes} /><Top title="Devices" rows={s.devices} /><Top title="Browser and system" rows={s.browsers} /></div>
    <div className="card"><b>Latest visits</b><div className="vz-tbl"><table><thead><tr><th>Last seen</th><th>IP</th><th>Location</th><th>Device</th><th>Account</th><th>Came from</th><th>Landing</th><th>Pages</th><th>Clicks</th><th>Time</th></tr></thead><tbody>
      {s.recent.map(({ v: x, handle, internal }) => <tr key={x.id}><td><Link href={`/admin/visitors?v=${x.id}`}>{time(x.lastAt)}</Link></td><td className="mono">{x.ip}</td><td>{[x.city, x.country].filter(Boolean).join(", ") || "?"}</td><td>{x.device} · {x.browser}</td><td>{handle ? <>{handle} <span className={"bo-tag" + (internal ? "" : " ext")}>{internal ? "internal" : "external"}</span></> : <span className="muted">guest</span>}</td><td>{x.refCode ? `invite ${x.refCode}` : x.referrer ?? "Direct"}</td><td className="vz-cut">{x.landing}</td><td>{x.pages}</td><td>{x.clicks}</td><td>{fmtDur(Math.round((x.lastAt.getTime() - x.startedAt.getTime()) / 1000))}</td></tr>)}
    </tbody></table></div></div>
  </div>);
}
