"use client";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { issueAnswer, issueStatus, issuesStatus } from "../actions";

type Ctx = { ua?: string; viewport?: string; net?: string | null; online?: boolean; errors?: { at: string; msg: string }[]; conversation?: string };
type Row = { kind: string; topic: string | null; contact: string | null; id: string; handle: string | null; userId: string | null; status: string; at: string; message: string; page: string; ctx: Record<string, unknown> };
const LABEL: Record<string, string> = { open: "Open", handling: "In progress", done: "Done" };
const TOPIC: Record<string, string> = { question: "Question", problem: "Not working", payment: "Payments", account: "Account", partnership: "Partnership", other: "Other" };
const noop = () => () => {};

function ago(iso: string, now: number) {
  if (!now) return "";
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
}

export default function IssueList({ rows }: { rows: Row[] }) {
  const now = useSyncExternalStore(noop, () => Date.now(), () => 0);
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "open" | "handling" | "done">("open");
  const [withErr, setWithErr] = useState(false);
  const [kind, setKind] = useState<"all" | "problem" | "message">("all");
  const [oldest, setOldest] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const counts = useMemo(() => ({ all: rows.length, open: rows.filter((r) => r.status === "open").length, handling: rows.filter((r) => r.status === "handling").length, done: rows.filter((r) => r.status === "done").length }), [rows]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const out = rows.filter((r) => (st === "all" || r.status === st) && (kind === "all" || r.kind === kind) && (!withErr || ((r.ctx as Ctx).errors?.length ?? 0) > 0)
      && (!n || `${r.handle ?? ""} ${r.message} ${r.page}`.toLowerCase().includes(n)));
    return oldest ? [...out].reverse() : out;
  }, [rows, q, st, kind, withErr, oldest]);

  const toggle = (id: string) => setOpenIds((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const pick = (id: string) => setSel((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const allPicked = list.length > 0 && list.every((r) => sel.has(r.id));
  const bulk = (s: "open" | "handling" | "done") => start(async () => { await issuesStatus([...sel], s); setSel(new Set()); });

  return (<div className="pl">
    <div className="pl-bar">
      <label className="pl-search"><svg className="ico sm" aria-hidden="true"><use href="#i-search" /></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search person, message or page" /></label>
      <div className="pl-seg" role="tablist">{(["open", "handling", "done", "all"] as const).map((k) => <button key={k} role="tab" aria-selected={st === k} className={st === k ? "on" : ""} onClick={() => setSt(k)}>{k === "all" ? "All" : LABEL[k]}<i>{counts[k]}</i></button>)}</div>
      <div className="pl-seg" role="tablist" aria-label="Type">{(["all", "problem", "message"] as const).map((k) => <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k === "all" ? "Everything" : k === "problem" ? "Problems" : "Messages"}</button>)}</div>
      <button className={"pl-chip" + (withErr ? " on" : "")} onClick={() => setWithErr((v) => !v)}>Has browser errors</button>
      <button className="pl-chip" onClick={() => setOldest((v) => !v)}>{oldest ? "Oldest first" : "Newest first"}</button>
      <button className="pl-chip" onClick={() => setOpenIds(openIds.size ? new Set() : new Set(list.map((r) => r.id)))}>{openIds.size ? "Collapse all" : "Expand all"}</button>
    </div>
    {sel.size ? <div className="pl-bulk"><b>{sel.size} selected</b><button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => bulk("handling")}>Mark in progress</button><button className="btn btn-primary btn-sm" disabled={pending} onClick={() => bulk("done")}>Mark done</button><button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => bulk("open")}>Reopen</button><button className="pr-link" onClick={() => setSel(new Set())}>Clear</button></div> : null}
    <div className="pl-table" role="table">
      <div className="pl-head" role="row"><label className="pl-ck"><input type="checkbox" checked={allPicked} onChange={() => setSel(allPicked ? new Set() : new Set(list.map((r) => r.id)))} aria-label="Select all" /></label><span>Person</span><span>Problem</span><span>Page</span><span>Status</span><span className="r">Age</span></div>
      {list.length ? list.map((r) => <Item key={r.id} r={r} open={openIds.has(r.id)} picked={sel.has(r.id)} onPick={() => pick(r.id)} onToggle={() => toggle(r.id)} age={ago(r.at, now)} />) : <p className="pl-empty">{rows.length ? "Nothing matches these filters." : "No reports yet. Quiet is good."}</p>}
    </div>
    <p className="t-sm muted pl-foot">{list.length} of {rows.length} shown</p>
  </div>);
}

function Item({ r, open, picked, onPick, onToggle, age }: { r: Row; open: boolean; picked: boolean; onPick: () => void; onToggle: () => void; age: string }) {
  const c = r.ctx as Ctx;
  const [reply, setReply] = useState(""); const [err, setErr] = useState(""); const [p, start] = useTransition();
  const errs = c.errors?.length ?? 0;
  return (<div className={"pl-item s-" + r.status + (open ? " is-open" : "")}>
    <div className="pl-row" role="row" onClick={onToggle}>
      <label className="pl-ck" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={picked} onChange={onPick} aria-label="Select" /></label>
      <span className="pl-who">{r.userId ? <Link href={`/admin/users/${r.userId}`} onClick={(e) => e.stopPropagation()}>{r.handle}</Link> : "Deleted account"}</span>
      <span className="pl-msg">{r.kind === "message" ? <b className="pl-kind">{TOPIC[r.topic ?? "other"] ?? "Message"}</b> : null}{r.message}{errs ? <em title="Browser errors attached">{errs} error{errs > 1 ? "s" : ""}</em> : null}</span>
      <span className="pl-page"><code>{r.page || "unknown"}</code></span>
      <span><b className={"pr-st s-" + r.status}>{LABEL[r.status]}</b></span>
      <span className="r pl-age">{age}<svg className={"ico sm pl-chev" + (open ? " up" : "")} aria-hidden="true"><use href="#i-down" /></svg></span>
    </div>
    {open ? <div className="pl-detail">
      <p className="pr-msg">{r.message}</p>
      <div className="pr-meta"><span>{new Date(r.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><code>{r.page || "unknown page"}</code>{c.viewport ? <span>{c.viewport}</span> : null}{c.net ? <span>{c.net}</span> : null}{c.online === false ? <span>offline</span> : null}{r.contact ? <span>Reach them: <b>{r.contact}</b></span> : null}</div>
      {c.conversation ? <div className="pr-errs conv"><b>Conversation with the assistant</b><code>{c.conversation}</code></div> : null}
      {errs ? <div className="pr-errs"><b>Last errors in the browser</b>{c.errors!.slice(-5).map((e, i) => <code key={i}>{e.msg}</code>)}</div> : null}
      {c.ua ? <p className="pr-ua t-xs muted">{c.ua}</p> : null}
      {r.status !== "done" ? <div className="pr-act">
        <input value={reply} onChange={(e) => { setReply(e.target.value); setErr(""); }} placeholder="Answer from ByRequest, sent to their messages" maxLength={1500} />
        <button className="btn btn-primary btn-sm" disabled={p || !r.userId} onClick={() => start(async () => { const x = await issueAnswer(r.id, reply); if (x.error) setErr(x.error); else setReply(""); })}>Send and close</button>
        {r.status === "open" ? <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(() => issueStatus(r.id, "handling"))}>I am on it</button> : null}
        <button className="btn btn-ghost btn-sm" disabled={p} onClick={() => start(() => issueStatus(r.id, "done"))}>Mark done</button>
        {err ? <span className="pb-err">{err}</span> : null}
      </div> : <button className="pr-link" onClick={() => start(() => issueStatus(r.id, "open"))}>Reopen</button>}
    </div> : null}
  </div>);
}
