import { getT } from "@/i18n/server";
import { textsIn } from "@/server/translate";
import { requireUser } from "@/server/auth";
import { conversations, inbox } from "@/server/queries";
import { markAllRead } from "../actions";
import { Av, Empty } from "@/components/ui";
import { ChatList, NoteList } from "./lists";

/* The message centre: every chat with its last activity and unread count, then the notifications by day. */
export default async function Inbox() {
  const { t, locale } = await getT();
  const u = await requireUser();
  const [notes, convs] = await Promise.all([inbox(u.id), conversations(u.id)]);
  const L = await textsIn(convs.map((c) => c.title), locale);
  const sys = (b: string) => { const amount = b.match(/€\d+(?:\.\d{2})?/)?.[0]; return amount ? t(b.replace(amount, "{amount}"), { amount }) : t(b); };
  const chats = convs.map((c) => ({
    id: c.id, title: L(c.title), other: c.other, status: c.status, unread: c.unread,
    avatar: <Av a={c.other_avatar as Parameters<typeof Av>[0]["a"]} name={c.other} size={48} />,
    lastAt: new Date(c.last_at).toISOString(), encrypted: c.last_kind === "e2e", mineLast: c.last_kind === "e2e" && c.last_sender === u.id,
    preview: c.last_kind === "e2e" ? t("Encrypted message") : c.last_body ? sys(c.last_body) : t("No messages yet"),
  }));
  const unreadChats = chats.filter((c) => c.unread).length;
  return (<div className="wrap inbox">
    <div className="page-h"><div><h1 className="t-h1">{t("Inbox")}</h1><p className="muted" style={{ marginTop: 6 }}>{t("Every chat belongs to a deal and is end to end encrypted. Payments outside ByRequest are never protected.")}</p></div>
      {notes.some((n) => !n.readAt) ? <form action={markAllRead}><button className="btn btn-secondary btn-sm">{t("Mark all as read")}</button></form> : null}</div>
    <div className="ib-grid">
      <section className="card ib-col"><div className="ib-h"><h2 className="t-h3">{t("Chats")}</h2>{unreadChats ? <span className="ib-badge num">{unreadChats}</span> : null}</div>
        {chats.length ? <ChatList chats={chats} /> : <Empty icon="inbox" title={t("No chats yet")} text={t("A chat opens as soon as a deal starts.")} />}</section>
      <section className="card ib-col"><div className="ib-h"><h2 className="t-h3">{t("Notifications")}</h2></div>
        {notes.length ? <NoteList notes={notes.map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, at: n.createdAt.toISOString(), unread: !n.readAt }))} />
          : <Empty icon="inbox" title={t("All quiet")} text={t("Offers, deliveries and messages show up here, always with neutral wording.")} />}</section>
    </div>
  </div>);
}
