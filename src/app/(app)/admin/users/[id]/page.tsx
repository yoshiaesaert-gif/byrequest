import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { LABEL, profileMissing, sizeText } from "@/domain/looks-detail";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/admin";
import { userDetail } from "@/server/backoffice";
import { Av, I, when } from "@/components/ui";
import { euros } from "@/domain/rules";
import { BlockAccount, RedoIdentity, HouseAccept, InternalToggle, RemoveRequest, SupportOrgForm } from "../../parts";
import { applicationsOf, offerUnread } from "@/server/teamchat";
import { journey } from "@/server/journey";
import Journey from "./journey";

export default async function Account({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireStaff();
  const [x, apps, prof, photos, jr] = await Promise.all([userDetail(id), applicationsOf(id), db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, id) }), db.select({ status: schema.previewPhotos.status }).from(schema.previewPhotos).where(eq(schema.previewPhotos.creatorId, id)), journey(id)]);
  const unread = await offerUnread(apps.map((a) => a.o.id), id);
  if (!x) notFound();
  const { u } = x;
  const spent = x.deals.filter((d) => d.d.buyerId === u.id && d.d.status !== "refunded").reduce((s, d) => s + d.d.dealCents + d.d.feeCents, 0);
  const earned = x.deals.filter((d) => d.d.creatorId === u.id && d.d.status === "released").reduce((s, d) => s + d.d.creatorCents, 0);
  return (<div className="wrap bo-page">
    <Link href="/admin/users" className="back"><I n="left" c="sm" />Accounts</Link>
    <div className="bo-acc-h"><Av a={u.avatar} name={u.handle} size={64} square /><div>
      <h1>{u.handle}{u.internal ? <span className="bo-tag">internal</span> : <span className="bo-tag ext">external</span>}{x.staff ? <span className="bo-tag">{x.staff}</span> : null}</h1><InternalToggle id={u.id} internal={u.internal} />
      <p>{u.isCreator ? "Creator" : "Buyer"} · joined {when(u.createdAt)} · {role === "admin" ? u.email : "email visible to admins"}{u.marketingOptIn ? " · marketing opt in" : ""}</p>
      {u.bannedAt ? <p className="bo-warn">Blocked since {when(u.bannedAt)}{u.banReason ? `: ${u.banReason}` : ""}</p> : null}
    </div></div>

    <dl className="bo-kpis bo-kpis-4">
      <div><dt>Requests posted</dt><dd className="num">{x.reqs.length}</dd></div>
      <div><dt>Spent</dt><dd className="num">{euros(spent)}</dd></div>
      <div><dt>Offers made</dt><dd className="num">{x.offers}</dd></div>
      <div><dt>Earned</dt><dd className="num">{euros(earned)}</dd></div>
    </dl>

    {jr ? <Journey sessions={jr.sessions} summary={jr} /> : null}

    <div className="bo-cols">
      <section>
        <h2 className="bo-sh">Deals</h2>
        <div className="bo-list">{x.deals.map(({ d, title }) => (
          <div key={d.id} className="bo-ev"><span><b>{title}</b><small>{d.buyerId === u.id ? "as buyer" : "as creator"} · {d.status} · {euros(d.dealCents)}</small></span><time>{when(d.createdAt)}</time></div>))}
          {!x.deals.length ? <p className="muted t-sm">No deals.</p> : null}</div>
        <h2 className="bo-sh">Applications ({apps.length})</h2>
        <div className="bo-apps">{apps.map((a) => (<div key={a.o.id} className="bo-app">
          <div className="bo-app-h"><Link href={`/admin/requests/${a.requestId}`}><b>{a.title}</b></Link><span className={`crm-pill${a.o.status === "accepted" ? " s-external" : ""}`}>{a.o.status}</span></div>
          <small>to {a.author}{a.authorHouse ? " · team profile" : ""} · {euros(a.dealCents)} · request {a.reqStatus} · sent {when(a.o.createdAt)}</small>
          <small>Delivers within {a.o.etaHours} h · {a.o.showsFace ? "shows face" : "no face"} · vault {a.o.vault}</small>
          {a.o.note ? <p className="bo-app-note">“{a.o.note}”</p> : null}
          {a.authorHouse ? <div className="bo-app-act">{a.dealId ? <Link className="btn btn-primary btn-sm" href={`/admin/chat/${a.dealId}`}>Deal chat as {a.author}</Link> : null}<Link className={"btn btn-sm " + (a.dealId ? "btn-secondary" : "btn-primary")} href={`/admin/offer-chat/${a.o.id}`}>Message as {a.author}{unread[a.o.id] ? ` · ${unread[a.o.id]} new` : ""}</Link>{!a.dealId && a.o.status === "pending" && a.reqStatus === "open" ? <HouseAccept id={a.o.id} /> : null}{a.dealId ? <span className="t-xs muted">deal {a.dealStatus}</span> : null}</div> : null}
        </div>))}{!apps.length ? <p className="muted t-sm">No applications.</p> : null}</div>
        <h2 className="bo-sh">Requests</h2>
        <div className="bo-list">{x.reqs.map((r) => (
          <div key={r.id} className="bo-ev"><span><b>{r.title}</b><small>{r.status} · {euros(r.dealCents)} · {when(r.createdAt)}</small></span>{r.status === "open" ? <RemoveRequest id={r.id} /> : null}</div>))}
          {!x.reqs.length ? <p className="muted t-sm">No requests.</p> : null}</div>
      </section>
      <section>
        {u.isCreator ? <><h2 className="bo-sh">Public profile <Link href={`/c/${u.handle}`} className="bo-sh-l">Open as buyers see it</Link></h2>
          {prof ? (() => { const missing = profileMissing(prof); const d = prof.detail ?? {}; const rows: [string, string | null | undefined][] = [
            ["Bio", prof.bio], ["Height", prof.heightCm ? `${(prof.heightCm / 100).toFixed(2)} m` : null], ["Weight", prof.weightKg ? `${prof.weightKg} kg` : null], ["Build", prof.build], ["Hair", prof.hair], ["Eyes", prof.eyes], ["Distinctive features", prof.body], ["Tattoos", prof.tattoos],
            ["Sport", prof.sport], ["Work", prof.work], ["Languages", prof.languages],
            ["Gender", d.gender && LABEL[d.gender]], ["Body hair", d.bodyHair && LABEL[d.bodyHair]], ["Pubic hair", d.pubic && LABEL[d.pubic]], ["Penis length", sizeText(d)], ["Circumcised", d.cut && LABEL[d.cut]], ["Cup size", d.cup && LABEL[d.cup]],
            ["Likes to make", prof.makes.join(", ")], ["Never", prof.never.join(", ")], ["Shows face", prof.showsFace ? "Yes" : "No"], ["Profile", prof.visibility === "public" ? "Public" : "Only for buyers they apply to"]];
            return (<div className="bo-prof">{missing.length ? <p className="bo-warn">Not complete, cannot apply yet: {missing.join(", ")}</p> : <p className="bo-ok">Complete. Can apply.</p>}
              <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v ? "" : "muted"}>{v || "Not filled in"}</dd></div>)}</dl>
              <p className="t-xs muted">Preview album: {photos.length} photo{photos.length === 1 ? "" : "s"} ({photos.filter((x) => x.status === "approved").length} approved, {photos.filter((x) => x.status === "in_review").length} in review).</p></div>); })() : <p className="muted t-sm">No profile yet.</p>}
          <h2 className="bo-sh">Creator setup</h2>
          <p className="t-sm muted" style={{ marginBottom: 10 }}>Identity {x.onboarding?.identity ?? "not started"} · payouts {x.onboarding?.payout ?? "not started"} · restriction {x.onboarding?.restriction ?? "none"}</p>
          <div className="bo-inline"><Link href={`/admin/creators/${u.id}`} className="btn btn-secondary btn-sm">Open creator file</Link>{role === "admin" && x.onboarding?.identity === "approved" ? <RedoIdentity id={u.id} /> : null}</div></> : null}
        <h2 className="bo-sh">Account</h2>
        {role === "admin" ? <BlockAccount id={u.id} blocked={!!u.bannedAt} /> : <p className="t-sm muted">Blocking an account needs an admin.</p>}
        <h2 className="bo-sh">Support organisation</h2>
        <p className="t-sm muted" style={{ marginBottom: 8 }}>For recognised centres, sex worker organisations and trusted flaggers. Their reports get priority and they can contact creators. Check who they are first.</p>
        {role === "admin" ? <SupportOrgForm id={u.id} org={u.supportOrg} /> : <p className="t-sm">{u.supportOrg ?? "Not a support organisation"}</p>}
        <h2 className="bo-sh">History <Link href={`/admin/audit?q=${encodeURIComponent(u.handle)}`}>In the log</Link></h2>
        <div className="bo-list">{x.history.map((r) => (
          <div key={r.id} className="bo-ev"><span><b>{r.action}</b><small>{r.by}</small></span><time>{when(r.at)}</time></div>))}
          {!x.history.length ? <p className="muted t-sm">Nothing logged for this account.</p> : null}</div>
      </section>
    </div>
  </div>);
}
