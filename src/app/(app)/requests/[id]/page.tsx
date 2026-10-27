import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { request } from "@/server/queries";
import { access } from "@/server/onboarding";
import { BigNum, Chips, Cover, I, leftLabel } from "@/components/ui";
import { CAT_LABEL, VAULT_LABEL, amountLabel, euros, split } from "@/domain/rules";
import OfferForm from "./offer-form";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const r = await request(id);
  if (!r) notFound();
  if (r.buyerId === u.id) redirect(`/requests/${id}/offers`);
  const [a, mine, offers] = await Promise.all([
    u.isCreator ? access(u.id) : null,
    db.query.offers.findFirst({ where: and(eq(schema.offers.requestId, id), eq(schema.offers.creatorId, u.id)) }),
    db.select({ id: schema.offers.id }).from(schema.offers).where(eq(schema.offers.requestId, id)),
  ]);
  const profile = u.isCreator ? await db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, u.id) }) : null;
  const m = split(r.dealCents);
  const open = r.status === "open" && r.closesAt > new Date();
  const card = { ...r, offers: offers.length };

  return (<div className="wrap">
    <Link href="/for-you" className="back"><I n="left" c="sm" />Requests</Link>
    <div className="two">
      <div>
        <div className="card reqhero">
          <div className="media" style={{ aspectRatio: "16/10", borderRadius: "var(--r-lg)", overflow: "hidden", position: "relative" }}>
            <Cover cover={r.cover} frost={u.prefs.frost} />
            <div className="ov" style={{ position: "absolute", inset: 0, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "#fff" }}><div><Chips r={card} /><BigNum r={card} /></div></div>
          </div>
          <div style={{ padding: "20px 4px 4px" }}>
            <span className="eyebrow">{CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)} · {open ? `closes in ${leftLabel(r.closesAt).replace(" left", "")}` : "closed"}</span>
            <h1 className="t-h1" style={{ marginTop: 6 }}>{r.title}</h1>
            {r.details ? <p style={{ marginTop: 10, color: "var(--ink-2)" }}>{r.details}</p> : null}
            <dl className="dl" style={{ marginTop: 16 }}>
              <dt>Looking for</dt><dd>{r.who}, {r.ageMin} to {r.ageMax}</dd>
              <dt>Face</dt><dd>{r.face === "not_needed" ? "Not needed" : r.face === "optional" ? "Optional" : "Required"}</dd>
              <dt>Deliver within</dt><dd>{r.dueHours < 72 ? `${r.dueHours} hours` : `${Math.round(r.dueHours / 24)} days`}</dd>
              <dt>Vault at least</dt><dd>{VAULT_LABEL[r.minVault]}</dd>
              <dt>Offers so far</dt><dd>{offers.length}</dd>
            </dl>
          </div>
        </div>
      </div>
      <aside className="sticky" id="offer">
        <div className="card checkout">
          <div className="earnline"><span>You earn when it is approved</span><b className="num">{euros(m.creatorCents)}</b></div>
          {!open ? <p className="t-sm muted">This request is closed.</p>
            : !u.isCreator ? (<>
              <b className="t-h3">Want to make this?</b>
              <p className="t-sm muted">Become a creator in a few steps. Your legal name and ID are never shown on your profile.</p>
              <Link href="/settings#creator" className="btn btn-primary btn-block">Start creating</Link>
              <Link href={`/post?c=${r.category}&amount=${r.amount}&budget=${Math.round(r.dealCents / 100)}&title=${encodeURIComponent(r.title)}`} className="btn btn-secondary btn-block">Post a similar request</Link>
            </>)
            : !a!.caps.offer ? (<>
              <b className="t-h3">{a!.status === "pending_verification" ? "Your verification is being reviewed." : a!.areas.payout !== "approved" && a!.areas.identity === "approved" ? "Action needed to enable payouts." : "Finish your setup to make offers"}</b>
              <ul className="docsum">{a!.missing.map((x) => <li key={x}><I n="alert" c="sm" />{x}</li>)}</ul>
              {a!.status !== "suspended" ? <Link href="/onboarding" className="btn btn-primary btn-block">Continue setup</Link> : null}
            </>)
            : <OfferForm requestId={r.id} minVault={r.minVault} faceRequired={r.face === "required"} dueHours={r.dueHours} existing={mine ? { showsFace: mine.showsFace, vault: mine.vault, etaHours: mine.etaHours, note: mine.note, status: mine.status } : null} defaults={{ showsFace: profile?.showsFace ?? false, vault: profile?.defaultVault ?? "30d" }} />}
          <div className="protect"><span><I n="shield" c="sm" />The buyer’s payment is secured before you start</span><span><I n="lock" c="sm" />Chat is end to end encrypted</span><span><I n="eyeoff" c="sm" />Buyers see your username and avatar only</span></div>
        </div>
      </aside>
    </div>
  </div>);
}
