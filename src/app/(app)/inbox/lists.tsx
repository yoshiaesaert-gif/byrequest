"use client";
import Link from "next/link";
import { markNoteRead } from "../actions";
import { useSyncExternalStore } from "react";
import { useLocale, useT } from "@/i18n/client";

export type Chat = { id: string; title: string; other: string; avatar: React.ReactNode; status: string; lastAt: string; preview: string; mineLast: boolean; encrypted: boolean; unread: number };
export type Note = { id: string; title: string; body: string; href: string; at: string; unread: boolean };
const noop = () => () => {};
const ICON: [RegExp, string][] = [[/message/i, "inbox"], [/paid|payout|released|earn/i, "wallet"], [/refund|money/i, "money"], [/deliver|vault/i, "vault"], [/applied|candidate|offer|chose/i, "users"], [/approved|verified|ready/i, "check"], [/rejected|declined|problem|report/i, "alert"]];
const dayAgo = (n: number) => new Date(Date.now() - n * 86400_000).toDateString();
const Ico = ({ n, c }: { n: string; c?: string }) => <svg className={"ico " + (c ?? "")} aria-hidden="true"><use href={`#i-${n}`} /></svg>;

/* Times and day groups are drawn in the browser, so they follow the viewer's own time zone. */
function useClock() {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const locale = useLocale(), t = useT();
  const day = (d: Date) => d.toDateString();
  const short = (iso: string) => { if (!client) return ""; const d = new Date(iso), today = dayAgo(0), yest = dayAgo(1); return day(d) === today ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : day(d) === yest ? t("Yesterday") : d.toLocaleDateString(locale, { day: "numeric", month: "short" }); };
  const group = (iso: string) => { const d = new Date(iso), today = dayAgo(0), yest = dayAgo(1); return day(d) === today ? t("Today") : day(d) === yest ? t("Yesterday") : t("Earlier"); };
  return { client, short, group };
}

export function ChatList({ chats, team }: { chats: Chat[]; team?: { preview: string; at: string; unread: number } | null }) {
  const t = useT(); const { short } = useClock();
  return <div className="cl">{team ? <Link href="/inbox/byrequest" className={"cl-row cl-team" + (team.unread ? " unread" : "")}>
      <span className="cl-av"><img src="/apple-icon.png" alt="" width={48} height={48} /></span>
      <span className="cl-main"><span className="cl-top"><b>ByRequest</b><time>{short(team.at)}</time></span>
        <span className="cl-sub">{t("The team behind ByRequest")}</span>
        <span className="cl-prev">{team.preview}{team.unread ? <i className="cl-n num">{team.unread}</i> : null}</span></span>
    </Link> : null}{chats.map((c) => (
    <Link key={c.id} href={`/deals/${c.id}?from=inbox`} className={"cl-row" + (c.unread ? " unread" : "")}>
      <span className="cl-av">{c.avatar}</span>
      <span className="cl-main"><span className="cl-top"><b>{c.other}</b><time>{short(c.lastAt)}</time></span>
        <span className="cl-sub">{c.title}</span>
        <span className="cl-prev">{c.encrypted ? <Ico n="lock" c="sm" /> : null}{c.mineLast ? <em>{t("You")}: </em> : null}{c.preview}{c.unread ? <i className="cl-n num">{c.unread > 99 ? "99+" : c.unread}</i> : null}</span></span>
    </Link>))}</div>;
}

export function NoteList({ notes }: { notes: Note[] }) {
  const t = useT(); const { short, group, client } = useClock();
  const withAmount = (b: string) => { const many = b.match(/^You have (\d+) new messages\.$/); if (many) return t("You have {n} new messages.", { n: many[1] }); const amount = b.match(/€\d+(?:\.\d{2})?/)?.[0]; return amount ? t(b.replace(amount, "{amount}"), { amount }) : t(b); };
  const out: React.ReactNode[] = []; let g = "";
  for (const n of notes) {
    const h = client ? group(n.at) : "";
    if (h !== g) { g = h; if (h) out.push(<div key={"g" + n.id} className="nl-h">{h}</div>); }
    out.push(<Link key={n.id} href={n.href} onClick={() => { if (n.unread) markNoteRead(n.id); }} className={"nl-row" + (n.unread ? " unread" : "")}>
      <span className="nl-ic"><Ico n={ICON.find(([r]) => r.test(n.title + " " + n.body))?.[1] ?? "inbox"} /></span>
      <span className="nl-main"><b>{t(n.title)}</b><span>{withAmount(n.body)}</span></span>
      <span className="nl-r"><time>{short(n.at)}</time>{n.unread ? <i aria-label={t("Unread")} /> : null}</span>
    </Link>);
  }
  return <div className="nl">{out}</div>;
}

/* The team's messages as chat bubbles; times in the viewer's own time zone. */
export function TeamTimes({ msgs }: { msgs: { id: string; title: string; body: string; at: string }[] }) {
  const { short } = useClock();
  return <>{msgs.map((m) => <div key={m.id} className="bt-m"><b>{m.title}</b><p>{m.body}</p><time>{short(m.at)}</time></div>)}</>;
}
