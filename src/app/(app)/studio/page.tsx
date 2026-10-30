import { getT } from "@/i18n/server";
import Link from "next/link";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireCreator } from "@/server/auth";
import { albumsForCreator, creatorEarnings } from "@/server/queries";
import { access } from "@/server/onboarding";
import { listFor } from "@/server/participants";
import { profileMissing } from "@/domain/looks-detail";
import { Empty } from "@/components/ui";
import { euros } from "@/domain/rules";
import { AlbumAnswer, AddParticipant, AlbumManager } from "./parts";
import { myPhotos, ALBUM_MAX } from "@/server/albums";

export const dynamic = "force-dynamic";

/* The creator's workspace: what needs you now, what you are making, and the tools to make it. Money lives on Earnings. */
export default async function Studio() {
  const { t } = await getT();
  const u = await requireCreator();
  const D = schema.deals, R = schema.requests, O = schema.offers;
  const [a, albums, parts, earn, photos, prof, todo, [apps]] = await Promise.all([
    access(u.id), albumsForCreator(u.id), listFor(u.id), creatorEarnings(u.id), myPhotos(u.id),
    db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, u.id) }),
    db.select({ id: D.id, status: D.status, dueAt: D.dueAt, createdAt: D.createdAt, cents: D.creatorCents, title: R.title, category: R.category })
      .from(D).innerJoin(R, eq(R.id, D.requestId)).where(and(eq(D.creatorId, u.id), inArray(D.status, ["held", "reviewing", "delivered"]))).orderBy(asc(D.dueAt)).limit(12),
    db.select({ n: count() }).from(O).where(and(eq(O.creatorId, u.id), eq(O.status, "pending"))),
  ]);
  const missing = profileMissing(prof);
  const making = todo.filter((d) => d.status === "held");
  const now = Date.now();
  const left = (iso: Date) => { const h = Math.round((iso.getTime() - now) / 3600_000); return h < 0 ? t("overdue") : h < 48 ? t("{n} h left", { n: h }) : t("{n} days left", { n: Math.round(h / 24) }); };
  const next = making[0];
  const nextMove = next ? { href: `/deals/${next.id}`, title: t("Deliver “{title}”", { title: next.title }), sub: `${left(next.dueAt)} · ${euros(next.cents)}`, cta: t("Open deal") }
    : albums.length ? { href: "#previews", title: t("{n} buyers want a preview", { n: albums.length }), sub: t("Answer while they are still choosing"), cta: t("Answer") }
    : missing.length ? { href: "/settings#creator", title: t("Finish your profile"), sub: t("{n} details to add before you can apply", { n: missing.length }), cta: t("Complete") }
    : { href: "/for-you", title: t("Find your next request"), sub: t("Fresh requests with real budgets are on the board"), cta: t("Browse requests") };
  const tiles: [string, string, string, string, boolean][] = [
    ["/deals", t("To deliver"), String(making.length), making.length ? t("next {when}", { when: left(making[0].dueAt) }) : t("nothing due"), making.length > 0],
    ["#previews", t("Preview requests"), String(albums.length), albums.length ? t("waiting for your answer") : t("none waiting"), albums.length > 0],
    ["/deals", t("Applications"), String(apps.n), apps.n ? t("waiting for a buyer") : t("apply to a request"), false],
    ["/settings#creator", t("Profile"), missing.length ? `${missing.length}` : "✓", missing.length ? t("details still to add") : t("complete, buyers can picture you"), missing.length > 0],
  ];
  return (<div className="wrap st-page">
    <div className="ea-h"><div><h1 className="t-h1">{t("Studio")}</h1><p className="muted">{t("Your workspace: what needs you now, what you are making, and your tools.")}</p></div><Link href="/onboarding" className="btn btn-secondary">{t("Creator setup")}</Link></div>

    <section className="sp-hero">
      <div className="sp-next"><span>{t("Your next move")}</span><b>{nextMove.title}</b><small>{nextMove.sub}</small><Link href={nextMove.href} className="btn sp-cta">{nextMove.cta}</Link></div>
      <Link href="/earnings" className="sp-earn"><span>{t("Earnings")}</span><b className="num">{euros(earn.monthCents)}</b><small>{t("paid out this month")}</small><em>{t("{amount} on its way", { amount: euros(earn.pendingCents) })} →</em></Link>
    </section>

    <div className="sp-tiles">{tiles.map(([h, l, n, s, hot]) => <Link key={l} href={h} className={"sp-tile" + (hot ? " hot" : "")}><span>{l}</span><b className="num">{n}</b><small>{s}</small></Link>)}</div>

    {!a.caps.receivePayouts ? <Link href="/onboarding" className="sp-warn">{earn.heldCents ? t("{amount} waiting for payout setup", { amount: euros(earn.heldCents) }) : t("Set up payouts to receive your earnings.")}<span>→</span></Link> : null}

    <section className="ea-card" id="making"><div className="ea-ch"><div><h2>{t("What you are making")}</h2><p>{t("Your deals in order of deadline. Deliver in the deal room.")}</p></div></div>
      {todo.length ? <div className="sp-list">{todo.map((d) => {
        const total = d.dueAt.getTime() - d.createdAt.getTime(), used = Math.min(1, Math.max(0, (now - d.createdAt.getTime()) / Math.max(1, total)));
        return (<Link key={d.id} href={`/deals/${d.id}`} className="sp-row">
          <span className="sp-rt"><b>{d.title}</b><small>{d.status === "held" ? left(d.dueAt) : d.status === "reviewing" ? t("delivered, in review") : t("delivered, paying out soon")}</small></span>
          {d.status === "held" ? <span className={"sp-bar" + (used > 0.8 ? " late" : "")}><i style={{ width: `${Math.round(used * 100)}%` }} /></span> : <span className="ea-st st-delivered">{t("Delivered")}</span>}
          <b className="num">{euros(d.cents)}</b>
        </Link>);
      })}</div> : <Empty icon="spark" title={t("Nothing to make right now")} text={t("When a buyer chooses you, the deal shows up here with its deadline.")} />}
    </section>

    <div className="ea-grid">
      <section className="ea-card" id="previews"><div className="ea-ch"><div><h2>{t("Preview requests")}</h2><p>{t("Buyers who are choosing can ask to see more. You always decide.")}</p></div>{albums.length ? <span className="sp-badge">{albums.length}</span> : null}</div>
        {albums.length ? <div className="list">{albums.map((x) => <AlbumAnswer key={x.a.id} id={x.a.id} title={x.title} photos={photos} canShare={a.caps.upload} />)}</div> : <p className="ea-empty">{t("No preview requests right now.")}</p>}
      </section>
      <section className="ea-card" id="participants"><div className="ea-ch"><div><h2>{t("People in your content")}</h2><p>{t("Anyone else who is visible or audible verifies as an adult and consents to each delivery. They do not need an account.")}</p></div></div>
        {parts.length ? <div className="sp-people">{parts.map((p) => <div key={p.id} className="setrow"><div><b>{p.label}</b><span className="s">{t("Added")} {p.createdAt.toISOString().slice(0, 10)}</span></div><span className={`status st-${p.identity}`}>{t(p.identity === "approved" ? "Verified" : p.identity === "pending" ? "Being reviewed" : p.identity === "not_started" ? "Not verified yet" : "Needs action")}</span></div>)}</div> : null}
        <AddParticipant />
      </section>
    </div>

    <section className="ea-card" id="album"><div className="ea-ch"><div><h2>{t("Your preview album")}</h2><p>{t("Photos and a video only you control. Hidden from everyone; a buyer sees each photo once for 10 seconds and each video once, with their name on it, and only when you share.")}</p></div><span className="sp-badge soft">{photos.length}/{ALBUM_MAX}</span></div>
      <AlbumManager photos={photos} max={ALBUM_MAX} canUpload={a.caps.upload} />
    </section>
  </div>);
}
