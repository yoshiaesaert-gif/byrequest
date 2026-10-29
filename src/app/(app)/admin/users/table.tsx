"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export type Row = { id: string; handle: string; email: string; source: "external" | "internal" | "team" | "staff"; staff: string | null; type: "Creator" | "Buyer"; bought: number; sold: number; spent: number; earned: number; country: string; joined: string; seen: string | null; status: "active" | "blocked" | "deleted" };
type Key = "handle" | "source" | "type" | "email" | "country" | "deals" | "value" | "joined" | "seen" | "status";
const deals = (r: Row) => (r.type === "Creator" ? r.sold : r.bought);
const value = (r: Row) => (r.type === "Creator" ? r.earned : r.spent);

const SOURCE: Record<Row["source"], string> = { external: "External", internal: "Internal", team: "Team profile", staff: "Staff" };
const eur = (c: number) => (c ? `€${Math.round(c / 100).toLocaleString("nl-BE")}` : "–");
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("nl-BE", { day: "2-digit", month: "short", year: "2-digit" }) : "–");
const ago = (s: string | null) => { if (!s) return "Never"; const m = (Date.now() - new Date(s).getTime()) / 60000; return m < 60 ? "Now" : m < 1440 ? `${Math.floor(m / 60)} h ago` : m < 43200 ? `${Math.floor(m / 1440)} d ago` : date(s); };

export default function AccountsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<"all" | Row["source"]>("all");
  const [type, setType] = useState<"all" | Row["type"]>("all");
  const [status, setStatus] = useState<"all" | Row["status"]>("all");
  const [sort, setSort] = useState<{ k: Key; asc: boolean }>({ k: "joined", asc: false });
  const counts = useMemo(() => ({ all: rows.length, external: rows.filter((r) => r.source === "external").length, creators: rows.filter((r) => r.type === "Creator" && r.source === "external").length, buyers: rows.filter((r) => r.type === "Buyer" && r.source === "external").length }), [rows]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = rows.filter((r) => (source === "all" || r.source === source) && (type === "all" || r.type === type) && (status === "all" || r.status === status) && (!t || r.handle.toLowerCase().includes(t) || r.email.toLowerCase().includes(t)));
    const v = (r: Row) => { const x = sort.k === "deals" ? deals(r) : sort.k === "value" ? value(r) : r[sort.k]; return x === null ? "" : x; };
    return f.sort((a, b) => { const x = v(a), y = v(b); const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y)); return sort.asc ? c : -c; });
  }, [rows, q, source, type, status, sort]);
  const th = (k: Key, label: string, right = false) => <th className={(right ? "r " : "") + "crm-th" + (sort.k === k ? " on" : "")} aria-sort={sort.k === k ? (sort.asc ? "ascending" : "descending") : "none"}><button type="button" onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : k === "handle" || k === "email" }))}>{label}<span>{sort.k === k ? (sort.asc ? "↑" : "↓") : ""}</span></button></th>;
  const sel = <T extends string>(v: T, set: (x: T) => void, opts: [T, string][], label: string) => <label className="crm-sel"><span>{label}</span><select value={v} onChange={(e) => set(e.target.value as T)}>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>;
  const csv = () => { const head = ["handle", "email", "source", "type", "country", "bought", "sold", "spent_eur", "earned_eur", "joined", "last_seen", "status"]; const lines = shown.map((r) => [r.handle, r.email, r.source, r.type, r.country, r.bought, r.sold, r.spent / 100, r.earned / 100, r.joined, r.seen ?? "", r.status].join(",")); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" })); a.download = "accounts.csv"; a.click(); };

  return (<div className="crm">
    <div className="crm-stats">
      <div><span>All accounts</span><b>{counts.all}</b></div>
      <div className="ext"><span>External</span><b>{counts.external}</b></div>
      <div><span>External creators</span><b>{counts.creators}</b></div>
      <div><span>External buyers</span><b>{counts.buyers}</b></div>
    </div>
    <div className="crm-bar">
      <label className="crm-search"><svg className="ico sm" aria-hidden="true"><use href="#i-search" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or email" /></label>
      {sel(source, setSource, [["all", "All"], ["external", "External"], ["internal", "Internal"], ["team", "Team profile"], ["staff", "Staff"]], "Source")}
      {sel(type, setType, [["all", "All"], ["Creator", "Creators"], ["Buyer", "Buyers"]], "Type")}
      {sel(status, setStatus, [["all", "All"], ["active", "Active"], ["blocked", "Blocked"], ["deleted", "Deleted"]], "Status")}
      <span className="crm-n">{shown.length} shown</span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={csv}>Export CSV</button>
    </div>
    <div className="crm-wrap"><table className="crm-t">
      <thead><tr>{th("handle", "Account")}{th("source", "Source")}{th("type", "Type")}{th("email", "Email")}{th("country", "Country")}{th("deals", "Deals", true)}{th("value", "Value", true)}{th("joined", "Joined")}{th("seen", "Last seen")}{th("status", "Status")}</tr></thead>
      <tbody>{shown.map((r) => (<tr key={r.id}>
        <td><Link href={`/admin/users/${r.id}`} className="crm-acc">{r.handle}</Link></td>
        <td><span className={`crm-pill s-${r.source}`}>{SOURCE[r.source]}{r.staff ? ` · ${r.staff}` : ""}</span></td>
        <td>{r.type}</td>
        <td className="crm-mail">{r.email}</td>
        <td>{r.country || "–"}</td>
        <td className="r num">{deals(r) || "–"}</td>
        <td className="r num" title={r.type === "Creator" ? "Earned" : "Spent"}>{eur(value(r))}</td>
        <td className="num">{date(r.joined)}</td><td>{ago(r.seen)}</td>
        <td><span className={`crm-st st-${r.status}`}><i />{r.status}</span></td>
      </tr>))}</tbody>
    </table>{!shown.length ? <p className="crm-empty">No accounts match these filters.</p> : null}</div>
  </div>);
}
