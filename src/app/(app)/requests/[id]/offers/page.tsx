import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { offersFor, request } from "@/server/queries";
import { I } from "@/components/ui";
import { CAT_LABEL, VAULT_LABEL, amountLabel, split } from "@/domain/rules";
import Picker from "./picker";

export default async function Offers({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const r = await request(id);
  if (!r || r.buyerId !== u.id) notFound();
  const list = await offersFor(id);
  const deal = r.status === "matched" ? await db.query.deals.findFirst({ where: eq(schema.deals.requestId, id) }) : null;
  const m = split(r.dealCents);
  const open = r.status === "open" && r.closesAt > new Date();
  return (<div className="wrap">
    <Link href="/deals" className="back"><I n="left" c="sm" />Deals</Link>
    {(await searchParams).posted ? <div className="banner ok"><I n="check" /><div className="grow"><b>Your request is live.</b><div className="t-sm">Creators who fit will make offers. You get a neutral notification for each one.</div></div></div> : null}
    <div className="page-h"><div><span className="eyebrow">Your request · {open ? "open" : "closed"}</span><h1 className="t-h1" style={{ marginTop: 6 }}>{r.title}</h1>
      <p className="muted t-sm" style={{ marginTop: 6 }}>{CAT_LABEL[r.category]} · {amountLabel(r.category, r.amount)} · {r.who}, {r.ageMin} to {r.ageMax} · {r.face === "not_needed" ? "No face needed" : r.face === "optional" ? "Face optional" : "Face required"} · Vault at least {VAULT_LABEL[r.minVault].toLowerCase()}</p></div></div>
    <Picker
      requestId={r.id} open={open} dealId={deal?.id ?? null}
      money={{ deal: m.dealCents, fee: m.feeCents, total: m.buyerPays }}
      offers={list.map(({ o, u: c, p }) => ({ id: o.id, status: o.status, showsFace: o.showsFace, vault: o.vault, etaHours: o.etaHours, note: o.note, handle: c.handle, look: c.avatar?.kind === "3d" ? `/av/${c.avatar.look}.webp` : c.avatar?.kind === "built" && c.avatar.svg ? `data:image/svg+xml;utf8,${encodeURIComponent(c.avatar.svg)}` : null, rating: c.ratingCount ? c.ratingSum / c.ratingCount : null, deals: c.ratingCount, visibility: p.visibility }))}
    />
  </div>);
}
