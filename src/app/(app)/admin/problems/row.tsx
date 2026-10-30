"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { issueAnswer, issueStatus } from "../actions";

type Ctx = { ua?: string; viewport?: string; net?: string | null; online?: boolean; errors?: { at: string; msg: string }[]; from?: string };

export default function IssueRow({ id, handle, userId, status, at, message, page, ctx }: { id: string; handle: string | null; userId: string | null; status: string; at: string; message: string; page: string; ctx: Record<string, unknown> }) {
  const c = ctx as Ctx;
  const [reply, setReply] = useState(""); const [err, setErr] = useState(""); const [p, start] = useTransition(); const [more, setMore] = useState(false);
  const when = new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (<article className={"pr-row s-" + status}>
    <header><span className="pr-who">{userId ? <Link href={`/admin/users/${userId}`}>{handle}</Link> : "Deleted account"}</span><time>{when}</time><span className={"pr-st s-" + status}>{status === "open" ? "Open" : status === "handling" ? "Looking into it" : "Done"}</span></header>
    <p className="pr-msg">{message}</p>
    <div className="pr-meta"><code>{page || "unknown page"}</code>{c.viewport ? <span>{c.viewport}</span> : null}{c.net ? <span>{c.net}</span> : null}{c.online === false ? <span>offline</span> : null}</div>
    {c.errors?.length ? <div className="pr-errs"><b>Last errors in the browser</b>{c.errors.slice(-4).map((e, i) => <code key={i}>{e.msg}</code>)}</div> : null}
    {more ? <p className="pr-ua t-xs muted">{c.ua}</p> : <button className="pr-link" onClick={() => setMore(true)}>Show device</button>}
    {status !== "done" ? <div className="pr-act">
      <input value={reply} onChange={(e) => { setReply(e.target.value); setErr(""); }} placeholder="Answer from ByRequest, sent to their messages" maxLength={1500} />
      <button className="btn btn-primary btn-sm" disabled={p || !userId} onClick={() => start(async () => { const r = await issueAnswer(id, reply); if (r.error) setErr(r.error); else setReply(""); })}>Send and close</button>
      {status === "open" ? <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(() => issueStatus(id, "handling"))}>I am on it</button> : null}
      <button className="btn btn-ghost btn-sm" disabled={p} onClick={() => start(() => issueStatus(id, "done"))}>Mark done</button>
      {err ? <span className="pb-err">{err}</span> : null}
    </div> : <button className="pr-link" onClick={() => start(() => issueStatus(id, "open"))}>Reopen</button>}
  </article>);
}
