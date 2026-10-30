import { requireStaff } from "@/server/admin";
import { openIssues } from "@/server/issues";
import IssueList from "./row";

export const dynamic = "force-dynamic";

/* Technical problems people report from inside the app: search, filter, open a row for the details and answer from there. */
export default async function Problems() {
  await requireStaff();
  const rows = await openIssues();
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Problems</h1><p>Reported from the app by signed in people. The page, device and last browser errors come along. An answer lands in their ByRequest messages.</p></div>
    <IssueList rows={rows.map((r) => ({ id: r.i.id, handle: r.handle, userId: r.i.userId, status: r.i.status, at: r.i.createdAt.toISOString(), message: r.i.message, page: r.i.page, ctx: r.i.context }))} />
  </div>);
}
