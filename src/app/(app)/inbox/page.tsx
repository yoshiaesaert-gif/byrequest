import { getT } from "@/i18n/server";
import { textsIn } from "@/server/translate";
import Link from "next/link";
import { requireUser } from "@/server/auth";
import { inbox, myDeals } from "@/server/queries";
import { markAllRead } from "../actions";
import { Empty, I } from "@/components/ui";

export default async function Inbox() {
  const { t, locale } = await getT();
  const u = await requireUser();
  const [notes, deals] = await Promise.all([inbox(u.id), myDeals(u.id)]);
  const L = await textsIn(deals.map((x) => x.r.title), locale);
  const chats = deals.filter((d) => ["held", "reviewing", "delivered", "disputed"].includes(d.d.status));
  const ago = (d: Date) => { const m = Math.round((Date.now() - d.getTime()) / 60000); return m < 60 ? `${Math.max(1, m)}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };
  return (<div className="wrap">
    <div className="page-h"><div><h1 className="t-h1">{t("Inbox")}</h1><p className="muted" style={{ marginTop: 6 }}>{t("Every chat belongs to a deal and is end to end encrypted. Payments outside ByRequest are never protected.")}</p></div>
      {notes.some((n) => !n.readAt) ? <form action={markAllRead}><button className="btn btn-secondary btn-sm">{t("Mark all as read")}</button></form> : null}</div>
    {chats.length ? <section className="sec"><div className="sec-h"><h2 className="t-h2">{t("Active chats")}</h2></div><div className="card" style={{ padding: "4px 16px" }}><div className="list">{chats.map(({ d, r }) => (
      <Link key={d.id} href={`/deals/${d.id}`} className="lrow"><span className="ic" style={{ width: 44, height: 44, borderRadius: 14, background: "var(--brand-soft)", display: "grid", placeItems: "center" }}><I n="lock" /></span><div style={{ minWidth: 0 }}><b>{L(r.title)}</b><div className="t-sm muted">{t("Encrypted chat")}</div></div><I n="right" /></Link>))}</div></div></section> : null}
    <section className="sec"><div className="sec-h"><h2 className="t-h2">{t("Notifications")}</h2></div>
      {notes.length ? <div className="card" style={{ padding: "4px 16px" }}><div className="list">{notes.map((n) => (
        <Link key={n.id} href={n.href} className="lrow" style={{ gridTemplateColumns: "12px minmax(0,1fr) auto" }}><span style={{ width: 8, height: 8, borderRadius: 4, background: n.readAt ? "transparent" : "var(--brand)" }} /><div style={{ minWidth: 0 }}><b>{t(n.title)}</b><div className="t-sm muted">{t(n.body)}</div></div><span className="t-xs muted">{ago(n.createdAt)}</span></Link>))}</div></div>
        : <Empty icon="inbox" title={t("All quiet")} text={t("Offers, deliveries and messages show up here, always with neutral wording.")} />}
    </section>
  </div>);
}
