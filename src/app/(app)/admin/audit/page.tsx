import Link from "next/link";
import { auditRows, transparency } from "@/server/backoffice";
import { when } from "@/components/ui";

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const rows = await auditRows({ q, limit: 200 });
  const year = new Date().getFullYear();
  const t = await transparency(year);
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Audit log</h1><p>Every staff action, provider event and access to confidential data. Entries cannot be edited or removed from here.</p></div>
    <section style={{ marginBottom: 28 }}><h2 className="bo-sh">Transparency, {year}</h2>
      <p className="t-sm muted" style={{ marginBottom: 10 }}>Figures for the yearly DSA transparency report: notices by kind and outcome with the average handling time, measures and whether they were automated, and appeals.</p>
      <div className="bo-cols">
        <div className="bo-table"><table><thead><tr><th>Notice</th><th>Outcome</th><th className="r">Count</th><th className="r">Avg hours</th></tr></thead><tbody>{t.rep.map((r) => <tr key={r.kind + r.status}><td>{r.kind}</td><td>{r.status}</td><td className="r num">{r.n}</td><td className="r num">{r.hours}</td></tr>)}</tbody></table>{!t.rep.length ? <p className="muted t-sm bo-empty">No notices yet.</p> : null}</div>
        <div className="bo-table"><table><thead><tr><th>Measure</th><th>Automated</th><th className="r">Count</th></tr></thead><tbody>{t.dec.map((r) => <tr key={r.action + String(r.automated)}><td>{r.action}</td><td>{r.automated ? "yes" : "no"}</td><td className="r num">{r.n}</td></tr>)}{t.app.map((r) => <tr key={"a" + r.status}><td>appeals</td><td>{r.status}</td><td className="r num">{r.n}</td></tr>)}</tbody></table>{!t.dec.length && !t.app.length ? <p className="muted t-sm bo-empty">No measures yet.</p> : null}</div>
      </div></section>
    <form className="bo-search" action="/admin/audit"><input className="input" name="q" defaultValue={q} placeholder="Action, actor or username, for example confidential or staff" autoComplete="off" /><button className="btn btn-primary">Filter</button></form>
    <div className="bo-table"><table><thead><tr><th>When</th><th>Action</th><th>By</th><th>Account</th><th>Detail</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td className="t-sm">{when(r.at)}</td><td><b>{r.action}</b></td><td className="t-sm">{r.by}</td><td>{r.subject ? <Link href={`/admin/users/${r.subjectUserId}`}>{r.subject}</Link> : "–"}</td><td className="t-xs bo-detail">{Object.keys(r.detail).length ? JSON.stringify(r.detail) : ""}</td></tr>)}</tbody></table>
      {!rows.length ? <p className="muted t-sm bo-empty">No entries match.</p> : null}</div>
  </div>);
}
