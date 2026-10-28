import { count, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/server/admin";
import { PROVIDER_ENV } from "@/config/compliance";
import AdminNav from "./nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireStaff();
  const [[a], [b], [c], [d], [e]] = await Promise.all([
    db.select({ n: count() }).from(schema.deliveries).where(eq(schema.deliveries.review, "pending_review")),
    db.select({ n: count() }).from(schema.disputes).where(eq(schema.disputes.outcome, "open")),
    db.select({ n: count() }).from(schema.removalRequests).where(inArray(schema.removalRequests.status, ["received"])),
    db.select({ n: count() }).from(schema.reports).where(inArray(schema.reports.status, ["received", "reviewing"])),
    db.select({ n: count() }).from(schema.requests).where(eq(schema.requests.status, "in_review")),
  ]);
  return (<div className="bo">
    <div className="bo-top"><div className="wrap bo-top-in">
      <div className="bo-brand"><img src="/icon.png" alt="" width={34} height={34} /><div><b>Back office</b><span>{user.handle} · {role}{PROVIDER_ENV === "test" ? " · test environment" : ""}</span></div></div>
      <AdminNav counts={{ "/admin/review": a.n + b.n + c.n + d.n, "/admin/requests": e.n }} />
    </div></div>
    {children}
  </div>);
}
