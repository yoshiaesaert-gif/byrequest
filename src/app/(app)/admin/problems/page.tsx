import { requireStaff } from "@/server/admin";
import { openIssues } from "@/server/issues";
import IssueList from "./row";

export const dynamic = "force-dynamic";

/* Technical problems people report from inside the app: search, filter, open a row for the details and answer from there. */
export default async function Problems() {
  await requireStaff();
  const rows = await openIssues();
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Support</h1><p>Every report from the help assistant and the contact form, as a ticket. Answers land in the person&apos;s ByRequest messages, you see when they are read, and they can write back. Notes stay inside the team.</p></div>
    <IssueList rows={rows.map((r) => ({ thread: r.thread, handledBy: r.i.handledBy, handledAt: r.i.handledAt?.toISOString() ?? null,
      who: { isCreator: r.isCreator, joined: r.joined?.toISOString() ?? null, identity: r.identity, lastSeen: r.lastSeen ? new Date(r.lastSeen).toISOString() : null, tickets: r.tickets ?? 0, banned: !!r.banned }, id: r.i.id, handle: r.handle, userId: r.i.userId, status: r.i.status, at: r.i.createdAt.toISOString(), message: r.i.message, page: r.i.page, ctx: r.i.context, kind: r.i.kind, topic: r.i.topic, contact: r.i.contact }))} />
  </div>);
}
