import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { request } from "@/server/queries";
import { access } from "@/server/onboarding";
import { BigNum, Chips, Cover, I, leftLabel } from "@/components/ui";
import { CAT_LABEL, VAULT_LABEL, euros, split } from "@/domain/rules";
import OfferForm from "./offer-form";

const CAT_ICON: Record<string, string> = { video: "video", photos: "image", voice: "mic", custom: "spark", worn: "shirt" };
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
        <div className="rd">
          <div className="rd-media">
            <Cover cover={r.cover} />
            <span className="rd-shade" />
            <div className="rd-top"><Chips r={card} />{offers.length ? <span className="mc">{offers.length} {offers.length === 1 ? "offer" : "offers"}</span> : null}</div>
            <div className="rd-bottom">
              <div className="rd-title">
                <span className="rd-cat"><I n={CAT_ICON[r.category]} c="sm" />{CAT_LABEL[r.category]} · {open ? `closes in ${leftLabel(r.closesAt).replace(" left", "")}` : "closed"}</span>
                <h1>{r.title}</h1>
              </div>
              <BigNum r={card} />
            </div>
          </div>
          {r.details ? <blockquote className="rd-note"><span>From the buyer</span>{r.details}</blockquote> : null}
          <dl className="rd-spec">
            <div><dt>Looking for</dt><dd>{r.who}, {r.ageMin} to {r.ageMax}</dd></div>
            <div><dt>Face</dt><dd>{r.face === "not_needed" ? "Not needed" : r.face === "optional" ? "Optional" : "Required"}</dd></div>
            <div><dt>Deliver within</dt><dd>{r.dueHours < 72 ? `${r.dueHours} hours` : `${Math.round(r.dueHours / 24)} days`}</dd></div>
            <div><dt>Vault at least</dt><dd>{VAULT_LABEL[r.minVault]}</dd></div>
          </dl>
          <Link href={`/report?type=request&ref=${r.id}`} className="report-link"><I n="alert" c="sm" />Report this request</Link>
          <p className="rd-how">You make an offer and the buyer picks one creator. The payment is secured before you start, and {euros(m.creatorCents)} is released to you after review and the 24 hour window.</p>
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
