import { requireStaff } from "@/server/admin";
import { team } from "@/server/backoffice";
import { TeamAdd, TeamRole } from "../parts";

export default async function Team() {
  const { user, role } = await requireStaff();
  const rows = await team();
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Team</h1><p><b>Support</b> reviews content, decides disputes, handles removals and answers appeals. <b>Admin</b> can also block accounts, restrict creators, reveal a legal identity with a logged purpose and manage this team. Nobody can approve an identity or payout check: that only happens through the provider.</p></div>
    {role === "admin" ? <section><h2 className="bo-sh">Add someone</h2><TeamAdd /><p className="t-sm muted" style={{ marginTop: 8 }}>They need a ByRequest account first. Every change is written to the audit log.</p></section> : <p className="t-sm muted">Only admins can change the team.</p>}
    <section><h2 className="bo-sh">Members</h2>
      <div className="bo-table"><table><thead><tr><th>Account</th><th>Email</th><th>Role</th><th /></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.userId}><td><b>{r.handle}</b></td><td className="t-sm">{r.email}</td><td><span className="bo-tag">{r.role}</span></td><td className="r">{role === "admin" ? <TeamRole handle={r.handle} role={r.role} self={r.userId === user.id} /> : null}</td></tr>)}</tbody></table></div></section>
  </div>);
}
