import { requireStaff } from "@/server/admin";
import { searchUsers } from "@/server/backoffice";
import AccountsTable, { type Row } from "./table";

// Support sees enough of the address to recognise it, admins see all of it.
const mask = (e: string) => { const [a, d] = e.split("@"); return `${a.slice(0, 2)}${"•".repeat(Math.max(1, a.length - 2))}@${d}`; };

export default async function Accounts() {
  const { role } = await requireStaff();
  const rows: Row[] = (await searchUsers("", "all")).map((u) => ({
    id: u.id, handle: u.handle, email: role === "admin" ? u.email : mask(u.email),
    source: u.staff ? "staff" : u.house ? "team" : u.internal ? "internal" : "external", staff: u.staff,
    type: u.isCreator ? "Creator" : "Buyer", bought: u.bought, sold: u.sold, spent: u.spent, earned: u.earned, country: u.country ?? "",
    joined: u.createdAt.toISOString(), seen: u.lastSeenAt?.toISOString() ?? null, status: u.deletedAt ? "deleted" : u.bannedAt ? "blocked" : "active",
  }));
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Accounts</h1><p>Every account on ByRequest. External means a real new person; internal accounts were made by the team. Opening an account is not logged, revealing a legal identity is.</p></div>
    <AccountsTable rows={rows} />
  </div>);
}
