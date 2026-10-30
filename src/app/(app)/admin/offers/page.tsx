import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireStaff } from "@/server/admin";
import { db, schema } from "@/db";
import { euros } from "@/domain/rules";
import { when } from "@/components/ui";

/* Every application: who applied, on which request, for which buyer. External first by default. */
const S = schema;
const SIDES: [string, string][] = [["external", "External creators"], ["internal", "Internal"], ["all", "Everyone"]];
const ST: Record<string, string> = { pending: "Waiting", accepted: "Chosen", declined: "Not chosen", withdrawn: "Withdrawn" };

export default async function Offers({ searchParams }: { searchParams: Promise<{ side?: string; status?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const side = sp.side ?? "external";
  const C = alias(S.users, "c"), B = alias(S.users, "b");
  const ext = sql`not (${C.internal} or ${C.house})`;
  const rows = await db.select({ o: S.offers, r: { id: S.requests.id, title: S.requests.title, dealCents: S.requests.dealCents, status: S.requests.status },
    creator: C.handle, creatorId: C.id, cInt: sql<boolean>`(${C.internal} or ${C.house})`, buyer: B.handle, buyerId: B.id, team: B.house,
    msgs: sql<number>`(select count(*)::int from offer_messages m where m.offer_id = ${S.offers.id})` })
    .from(S.offers).innerJoin(S.requests, eq(S.requests.id, S.offers.requestId)).innerJoin(C, eq(C.id, S.offers.creatorId)).innerJoin(B, eq(B.id, S.requests.buyerId))
    .where(sql`${side === "external" ? ext : side === "internal" ? sql`not (${ext})` : sql`true`} and ${sp.status ? sql`${S.offers.status} = ${sp.status}` : sql`true`}`)
    .orderBy(desc(S.offers.createdAt)).limit(300);
  const by = new Map<string, number>(); rows.forEach((x) => by.set(x.creator, (by.get(x.creator) ?? 0) + 1));
  const qs = (o: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ side, status: sp.status, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  return (<div className="wrap bo-page">
    <div className="bo-h"><h1>Offers</h1><p>Every application: which creator applied on which request, from which buyer, with what they promised. Open the chat to write to them as the buyer when it is a team request.</p></div>
    <div className="bo-tabs">{SIDES.map(([k, l]) => <Link key={k} href={qs({ side: k })} className={k === side ? "on" : ""}>{l}</Link>)}</div>
    <div className="of-sum">{[...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([h, n]) => <span key={h}><b>{h}</b>{n}</span>)}</div>
    <div className="optrow" style={{ margin: "0 0 12px" }}>{["", "pending", "accepted", "declined", "withdrawn"].map((s) => <Link key={s} href={qs({ status: s || undefined })} className={"chip" + ((sp.status ?? "") === s ? " is-on" : "")}>{s ? ST[s] : "Every status"}</Link>)}</div>
    <p className="t-sm muted" style={{ margin: "0 0 10px" }}>{rows.length} offers</p>
    {rows.length ? <div className="bo-table"><table><thead><tr><th>When</th><th>Creator</th><th>On request</th><th>Buyer</th><th className="r">Budget</th><th>Promised</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map((x) => (<tr key={x.o.id}>
        <td>{when(x.o.createdAt)}</td>
        <td><Link href={`/admin/users/${x.creatorId}`}>{x.creator}</Link><span className={"bo-tag " + (x.cInt ? "int" : "ext")}>{x.cInt ? "internal" : "external"}</span></td>
        <td className="bo-detail" style={{ maxWidth: 300, color: "var(--ink)" }}><Link href={`/admin/requests/${x.r.id}`}>{x.r.title}</Link>{x.o.note ? <small className="of-note">“{x.o.note}”</small> : null}</td>
        <td><Link href={`/admin/users/${x.buyerId}`}>{x.buyer}</Link>{x.team ? <span className="bo-tag">team</span> : null}</td>
        <td className="r num">{euros(x.r.dealCents)}</td>
        <td className="t-sm">{x.o.etaHours} h · {x.o.showsFace ? "face" : "no face"} · vault {x.o.vault}</td>
        <td><span className={"of-st " + x.o.status}>{ST[x.o.status] ?? x.o.status}</span></td>
        <td>{x.team ? <Link href={`/admin/offer-chat/${x.o.id}`} className="btn btn-secondary btn-sm">Chat{x.msgs ? ` (${x.msgs})` : ""}</Link> : null}</td>
      </tr>))}</tbody></table></div> : <p className="bo-empty">No offers here yet.</p>}
  </div>);
}
