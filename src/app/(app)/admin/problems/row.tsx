"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "@/components/chrome";
import { issueAnswer, issueAssign, issueNote, issueStatus, issuesStatus } from "../actions";

type Ctx = { answers?: { at: string; by: string; text: string }[]; ua?: string; viewport?: string; net?: string | null; online?: boolean; errors?: { at: string; msg: string }[]; conversation?: string };
type Entry = { at: string; kind: "reply" | "note" | "event" | "customer"; by?: string; text: string; readAt: string | null };
type Who = { isCreator: boolean | null; joined: string | null; identity: string | null; lastSeen: string | null; tickets: number; banned: boolean };
type Row = { thread: Entry[]; who: Who; handledBy: string | null; handledAt: string | null; kind: string; topic: string | null; contact: string | null; id: string; handle: string | null; userId: string | null; status: string; at: string; message: string; page: string; ctx: Record<string, unknown> };
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
  const [st, setSt] = useState<"active" | "all" | "open" | "handling" | "done">("active");
  const [withErr, setWithErr] = useState(false);
  const [kind, setKind] = useState<"all" | "problem" | "message">("all");
  const [oldest, setOldest] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const counts = useMemo(() => ({ active: rows.filter((r) => r.status !== "done").length, all: rows.length, open: rows.filter((r) => r.status === "open").length, handling: rows.filter((r) => r.status === "handling").length, done: rows.filter((r) => r.status === "done").length }), [rows]);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const out = rows.filter((r) => (st === "all" || (st === "active" ? r.status !== "done" : r.status === st)) && (kind === "all" || r.kind === kind) && (!withErr || ((r.ctx as Ctx).errors?.length ?? 0) > 0)
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
      <div className="pl-seg" role="tablist">{(["active", "open", "handling", "done", "all"] as const).map((k) => <button key={k} role="tab" aria-selected={st === k} className={st === k ? "on" : ""} onClick={() => setSt(k)}>{k === "all" ? "All" : k === "active" ? "Active" : LABEL[k]}<i>{counts[k]}</i></button>)}</div>
      <div className="pl-seg" role="tablist" aria-label="Type">{(["all", "problem", "message"] as const).map((k) => <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k === "all" ? "Everything" : k === "problem" ? "Problems" : "Messages"}</button>)}</div>
      <button className={"pl-chip" + (withErr ? " on" : "")} onClick={() => setWithErr((v) => !v)}>Has browser errors</button>
      <button className="pl-chip" onClick={() => setOldest((v) => !v)}>{oldest ? "Oldest first" : "Newest first"}</button>
      <button className="pl-chip" onClick={() => setOpenIds(openIds.size ? new Set() : new Set(list.map((r) => r.id)))}>{openIds.size ? "Collapse all" : "Expand all"}</button>
    </div>
    {sel.size ? <div className="pl-bulk"><b>{sel.size} selected</b><button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => bulk("handling")}>Mark in progress</button><button className="btn btn-primary btn-sm" disabled={pending} onClick={() => bulk("done")}>Mark done</button><button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => bulk("open")}>Reopen</button><button className="pr-link" onClick={() => setSel(new Set())}>Clear</button></div> : null}
    <div className="pl-table" role="table">
      <div className="pl-head" role="row"><label className="pl-ck"><input type="checkbox" checked={allPicked} onChange={() => setSel(allPicked ? new Set() : new Set(list.map((r) => r.id)))} aria-label="Select all" /></label><span>Person</span><span>Subject</span><span>Last activity</span><span>Status</span><span className="r">Waiting</span></div>
      {list.length ? list.map((r) => <Item key={r.id} r={r} open={openIds.has(r.id)} picked={sel.has(r.id)} onPick={() => pick(r.id)} onToggle={() => toggle(r.id)} age={ago(r.at, now)} now={now} />) : <p className="pl-empty">{rows.length ? "Nothing matches these filters." : "No reports yet. Quiet is good."}</p>}
    </div>
    <p className="t-sm muted pl-foot">{list.length} of {rows.length} shown</p>
  </div>);
}

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Brussels", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const span = (a: string, b: string) => { const m = Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.round(m / 1440)} d`; };

function Item({ r, open, picked, onPick, onToggle, age, now }: { r: Row; open: boolean; picked: boolean; onPick: () => void; onToggle: () => void; age: string; now: number }) {
  const c = r.ctx as Ctx;
  const [text, setText] = useState(""); const [mode, setMode] = useState<"reply" | "note">("reply"); const [err, setErr] = useState(""); const [p, start] = useTransition();
  // The typed text is kept in this tab, so a reload (for example during an update) never loses it.
  const key = `brq_ans_${r.id}`;
  useEffect(() => { const id = window.setTimeout(() => { try { const d = sessionStorage.getItem(key); if (d) setText(d); } catch { /* private mode */ } }, 0); return () => clearTimeout(id); }, [key]);
  const type = (v: string) => { setText(v); setErr(""); try { if (v) sessionStorage.setItem(key, v); else sessionStorage.removeItem(key); } catch { /* private mode */ } };
  const go = (close: boolean) => start(async () => {
    try {
      const x = mode === "note" ? await issueNote(r.id, text) : await issueAnswer(r.id, text, close);
      if (x.error) { setErr(x.error); return; }
      type(""); toast(mode === "note" ? "Note saved. Only the team sees it." : close ? `Sent to ${r.handle ?? "them"} and closed.` : `Sent to ${r.handle ?? "them"}.`);
    } catch { setErr("Not sent. Your text is kept: try again in a moment."); }
  });
  const errs = c.errors?.length ?? 0;
  const replies = r.thread.filter((e) => e.kind === "reply");
  const lastReply = replies.at(-1);
  const last = r.thread.at(-1);
  const waiting = r.status !== "done" && (!lastReply || r.thread.findLastIndex((e) => e.kind === "customer") > r.thread.findLastIndex((e) => e.kind === "reply"));
  const firstResponse = replies[0] ? span(r.at, replies[0].at) : null;
  const sla = waiting && now ? (now - +new Date(r.thread.filter((e) => e.kind === "customer").at(-1)?.at ?? r.at)) / 60000 : 0;
  return (<div className={"pl-item" + (open ? " is-open" : "")}>
    <div className="pl-row" role="row" onClick={onToggle}>
      <label className="pl-ck" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={picked} onChange={onPick} aria-label="Select" /></label>
      <span className="pl-who">{r.userId ? <Link href={`/admin/users/${r.userId}`} onClick={(e) => e.stopPropagation()}>{r.handle}</Link> : "Deleted account"}{r.handledBy ? <small>{r.handledBy}</small> : null}</span>
      <span className="pl-msg">{r.kind === "message" ? <b className="pl-kind">{TOPIC[r.topic ?? "other"] ?? "Message"}</b> : null}{r.message}{errs ? <em title="Browser errors attached">{errs} error{errs > 1 ? "s" : ""}</em> : null}</span>
      <span className="pl-last">{last ? <>{last.kind === "reply" ? <i className={"tk-rc" + (last.readAt ? " read" : "")}>{last.readAt ? "✓✓" : "✓"}</i> : null}{last.kind === "reply" ? (last.readAt ? "Read" : "Sent") : last.kind === "customer" ? "Customer replied" : last.kind === "note" ? "Note" : last.text}</> : "New"}</span>
      <span><b className={"pr-st s-" + r.status}>{LABEL[r.status]}</b></span>
      <span className={"r pl-age" + (waiting ? sla > 1440 ? " late" : sla > 60 ? " warm" : "" : "")}>{waiting ? age : "—"}<svg className={"ico sm pl-chev" + (open ? " up" : "")} aria-hidden="true"><use href="#i-down" /></svg></span>
    </div>
    {open ? <div className="tk">
      <div className="tk-main">
        <ol className="tk-thread">
          <li className="tk-m cust"><div className="tk-h"><b>{r.handle ?? "Visitor"}</b><span>{r.kind === "message" ? "via contact form" : "via the help assistant"} · {fmt(r.at)}</span></div><p>{r.message}</p>
            {c.conversation ? <details className="tk-conv"><summary>Conversation with the assistant</summary><code>{c.conversation}</code></details> : null}</li>
          {r.thread.map((e, i) => e.kind === "event" ? <li key={i} className="tk-ev"><span>{e.by ? <b>{e.by}</b> : null} {e.text.toLowerCase()} · {fmt(e.at)}</span></li> : (
            <li key={i} className={"tk-m " + (e.kind === "customer" ? "cust" : e.kind)}>
              <div className="tk-h"><b>{e.kind === "customer" ? r.handle : e.by ?? "Team"}</b><span>{e.kind === "note" ? "internal note, only the team sees this" : e.kind === "reply" ? "sent as Sophie · ByRequest support" : "replied"} · {fmt(e.at)}</span></div>
              <p>{e.text}</p>
              {e.kind === "reply" ? <div className={"tk-rcpt" + (e.readAt ? " read" : "")}><i>{e.readAt ? "✓✓" : "✓"}</i>{e.readAt ? `Read ${fmt(e.readAt)}` : "Delivered, not read yet"}</div> : null}
            </li>))}
        </ol>
        {r.status !== "done" || mode === "note" ? <div className={"tk-comp" + (mode === "note" ? " note" : "")}>
          <div className="tk-tabs"><button className={mode === "reply" ? "on" : ""} onClick={() => setMode("reply")}>Reply to {r.handle ?? "person"}</button><button className={mode === "note" ? "on" : ""} onClick={() => setMode("note")}>Internal note</button></div>
          <textarea value={text} onChange={(e) => type(e.target.value)} rows={3} maxLength={1500} placeholder={mode === "note" ? "Only the team sees this" : r.userId ? "Lands in their ByRequest messages, with a notice" : "This person has no account: answer them via the contact they left"} />
          <div className="tk-act">{err ? <span className="pb-err">{err}</span> : <span className="t-xs muted">{mode === "reply" ? "They see it from Sophie · ByRequest support, never your own name. You see here when it is read." : "Visible to staff only."}</span>}
            {mode === "note" ? <button className="btn btn-primary btn-sm" disabled={p || !text.trim()} onClick={() => go(false)}>Save note</button>
              : <><button className="btn btn-secondary btn-sm" disabled={p || !text.trim() || !r.userId} onClick={() => go(false)}>Send</button><button className="btn btn-primary btn-sm" disabled={p || !text.trim() || !r.userId} onClick={() => go(true)}>Send and close</button></>}</div>
        </div> : <div className="tk-closed">Closed{r.handledBy ? ` by ${r.handledBy}` : ""}{r.handledAt ? ` · ${fmt(r.handledAt)}` : ""}. <button className="pr-link" onClick={() => start(() => issueStatus(r.id, "open"))}>Reopen</button> <button className="pr-link" onClick={() => setMode("note")}>Add a note</button></div>}
      </div>
      <aside className="tk-side">
        <section><h4>Customer</h4>
          {r.userId ? <><Link href={`/admin/users/${r.userId}`} className="tk-who">{r.handle}</Link>
            <dl><div><dt>Type</dt><dd>{r.who.isCreator ? "Creator" : "Buyer"}</dd></div>{r.who.isCreator ? <div><dt>ID check</dt><dd className={r.who.identity === "approved" ? "ok" : "warn"}>{r.who.identity ?? "not started"}</dd></div> : null}
              <div><dt>Member since</dt><dd>{r.who.joined ? fmt(r.who.joined) : "?"}</dd></div><div><dt>Last seen</dt><dd>{r.who.lastSeen ? fmt(r.who.lastSeen) : "Not tracked"}</dd></div>
              <div><dt>Tickets</dt><dd>{r.who.tickets}</dd></div>{r.who.banned ? <div><dt>Account</dt><dd className="warn">Blocked</dd></div> : null}</dl>
            <Link href={`/admin/users/${r.userId}`} className="btn btn-secondary btn-sm btn-block">Journey and account</Link></> : <p className="t-sm">{r.contact ? <>Reach them: <b>{r.contact}</b></> : "No account and no contact left."}</p>}
        </section>
        <section><h4>Ticket</h4>
          <dl><div><dt>Status</dt><dd><b className={"pr-st s-" + r.status}>{LABEL[r.status]}</b></dd></div>
            <div><dt>Assignee</dt><dd>{r.handledBy ?? <span className="muted">Nobody</span>}</dd></div>
            <div><dt>Opened</dt><dd>{fmt(r.at)}</dd></div>
            <div><dt>First response</dt><dd>{firstResponse ?? <span className="muted">Not answered</span>}</dd></div>
            {lastReply ? <div><dt>Last answer</dt><dd>{lastReply.readAt ? `Read ${fmt(lastReply.readAt)}` : "Not read yet"}</dd></div> : null}
            {r.status === "done" && r.handledAt ? <div><dt>Resolved in</dt><dd>{span(r.at, r.handledAt)}</dd></div> : null}</dl>
          <div className="tk-sbtns">{r.status !== "done" ? <button className="btn btn-secondary btn-sm" disabled={p} onClick={() => start(() => issueAssign(r.id))}>Assign to me</button> : null}
            {r.status !== "done" ? <button className="btn btn-ghost btn-sm" disabled={p} onClick={() => start(() => issueStatus(r.id, "done"))}>Close without answer</button> : null}</div>
        </section>
        <section><h4>Technical</h4>
          <dl><div><dt>Page</dt><dd><code>{r.page || "unknown"}</code></dd></div>{c.viewport ? <div><dt>Screen</dt><dd>{c.viewport}</dd></div> : null}{c.net ? <div><dt>Network</dt><dd>{c.net}</dd></div> : null}{c.online === false ? <div><dt>Online</dt><dd className="warn">Offline</dd></div> : null}</dl>
          {errs ? <div className="pr-errs"><b>Last errors in the browser</b>{c.errors!.slice(-5).map((e, i) => <code key={i}>{e.msg}</code>)}</div> : null}
          {c.ua ? <p className="pr-ua t-xs muted">{c.ua}</p> : null}
        </section>
      </aside>
    </div> : null}
  </div>);
}
