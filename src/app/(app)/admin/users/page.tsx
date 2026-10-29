import Link from "next/link";
import { requireStaff } from "@/server/admin";
import { searchUsers } from "@/server/backoffice";
import { Av, when } from "@/components/ui";

const KINDS = [["all", "Everyone"], ["external", "External"], ["internal", "Internal"], ["creators", "Creators"], ["buyers", "Buyers"], ["banned", "Blocked"]] as const;
type Kind = (typeof KINDS)[number][0];
// Support sees enough of the address to recognise it, admins see all of it.
const mask = (e: string) => { const [a, d] = e.split("@"); return `${a.slice(0, 2)}${"•".repeat(Math.max(1, a.length - 2))}@${d}`; };

export default async function Accounts({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const { role } = await requireStaff();
  const sp = await searchParams;
  const kind: Kind = KINDS.some(([k]) => k === sp.kind) ? (sp.kind as Kind) : "all";
  const rows = await searchUsers(sp.q ?? "", kind);
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Accounts</h1><p>Search by username or email. Opening an account is not logged, revealing a legal identity is.</p></div>
    <form className="bo-search" action="/admin/users"><input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Username or email" autoComplete="off" /><input type="hidden" name="kind" value={kind} /><button className="btn btn-primary">Search</button></form>
    <div className="bo-tabs">{KINDS.map(([k, l]) => <Link key={k} href={`/admin/users?kind=${k}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={k === kind ? "on" : ""}>{l}</Link>)}</div>
    <div className="bo-table"><table><thead><tr><th>Account</th><th>Email</th><th>Type</th><th className="r">Bought</th><th className="r">Sold</th><th>Joined</th><th>Status</th></tr></thead>
      <tbody>{rows.map((u) => (<tr key={u.id}>
        <td><Link href={`/admin/users/${u.id}`} className="bo-acc"><Av a={u.avatar} name={u.handle} size={28} /><b>{u.handle}</b>{u.internal ? <span className="bo-tag">internal</span> : <span className="bo-tag ext">external</span>}{u.staff ? <span className="bo-tag">{u.staff}</span> : null}{u.house ? <span className="bo-tag">team profile</span> : null}</Link></td>
        <td className="t-sm">{role === "admin" ? u.email : mask(u.email)}</td><td>{u.isCreator ? "Creator" : "Buyer"}</td>
        <td className="r num">{u.bought}</td><td className="r num">{u.sold}</td><td className="t-sm">{when(u.createdAt)}</td>
        <td>{u.bannedAt ? <span className="status st-rejected">blocked</span> : <span className="status st-approved">active</span>}</td></tr>))}</tbody></table>
      {!rows.length ? <p className="muted t-sm bo-empty">No accounts match.</p> : null}</div>
  </div>);
}
