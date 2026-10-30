import { requireStaff } from "@/server/admin";
import { openIssues } from "@/server/issues";
import IssueList from "./row";

export const dynamic = "force-dynamic";

/* Technical problems people report from inside the app: search, filter, open a row for the details and answer from there. */
export default async function Problems() {
  await requireStaff();
  const rows = await openIssues();
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Support</h1><p>Technical problems reported from the app (page, device and browser errors come along) and messages from the contact form. Nothing here arrives by mail. An answer to a signed in person lands in their ByRequest messages.</p></div>
    <IssueList rows={rows.map((r) => ({ id: r.i.id, handle: r.handle, userId: r.i.userId, status: r.i.status, at: r.i.createdAt.toISOString(), message: r.i.message, page: r.i.page, ctx: r.i.context, kind: r.i.kind, topic: r.i.topic, contact: r.i.contact }))} />
  </div>);
}
