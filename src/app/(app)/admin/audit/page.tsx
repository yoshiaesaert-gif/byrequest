import Link from "next/link";
import { auditRows } from "@/server/backoffice";
import { when } from "@/components/ui";

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const rows = await auditRows({ q, limit: 200 });
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Audit log</h1><p>Every staff action, provider event and access to confidential data. Entries cannot be edited or removed from here.</p></div>
    <form className="bo-search" action="/admin/audit"><input className="input" name="q" defaultValue={q} placeholder="Action, actor or username, for example confidential or staff" autoComplete="off" /><button className="btn btn-primary">Filter</button></form>
    <div className="bo-table"><table><thead><tr><th>When</th><th>Action</th><th>By</th><th>Account</th><th>Detail</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td className="t-sm">{when(r.at)}</td><td><b>{r.action}</b></td><td className="t-sm">{r.by}</td><td>{r.subject ? <Link href={`/admin/users/${r.subjectUserId}`}>{r.subject}</Link> : "–"}</td><td className="t-xs bo-detail">{Object.keys(r.detail).length ? JSON.stringify(r.detail) : ""}</td></tr>)}</tbody></table>
      {!rows.length ? <p className="muted t-sm bo-empty">No entries match.</p> : null}</div>
  </div>);
}
