import Link from "next/link";
import { requireStaff } from "@/server/admin";
import { openIssues } from "@/server/issues";
import IssueRow from "./row";

export const dynamic = "force-dynamic";

/* Technical problems people report from inside the app, newest first, with what the browser saw. */
export default async function Problems() {
  await requireStaff();
  const rows = await openIssues();
  const open = rows.filter((r) => r.i.status !== "done");
  const done = rows.filter((r) => r.i.status === "done");
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Problems</h1><p>Reported from the app by signed in people. The page, device and last browser errors come along. Answer from here and it lands in their ByRequest messages.</p></div>
    <section><h2 className="bo-sh">Open <span className="bo-tag">{open.length}</span></h2>
      {open.length ? <div className="pr-list">{open.map((r) => <IssueRow key={r.i.id} id={r.i.id} handle={r.handle} userId={r.i.userId} status={r.i.status} at={r.i.createdAt.toISOString()} message={r.i.message} page={r.i.page} ctx={r.i.context} />)}</div> : <p className="t-sm muted">Nothing open. Quiet is good.</p>}</section>
    {done.length ? <section><h2 className="bo-sh">Handled</h2><div className="pr-list">{done.slice(0, 20).map((r) => <IssueRow key={r.i.id} id={r.i.id} handle={r.handle} userId={r.i.userId} status={r.i.status} at={r.i.createdAt.toISOString()} message={r.i.message} page={r.i.page} ctx={r.i.context} />)}</div></section> : null}
    <p className="t-sm muted" style={{ marginTop: 20 }}><Link href="/admin/review">Safety reports</Link> are handled in the review queue.</p>
  </div>);
}
