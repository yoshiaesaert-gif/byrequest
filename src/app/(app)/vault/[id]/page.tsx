import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import Viewer from "./viewer";

export default async function View({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const v = await db.query.vaultItems.findFirst({ where: eq(schema.vaultItems.id, id) });
  if (!v || v.buyerId !== u.id) notFound();
  const siblings = await db.select({ id: schema.vaultItems.id, mime: schema.media.mime }).from(schema.vaultItems).innerJoin(schema.media, eq(schema.media.id, schema.vaultItems.mediaId))
    .where(and(eq(schema.vaultItems.dealId, v.dealId), eq(schema.vaultItems.buyerId, u.id))).orderBy(asc(schema.vaultItems.position));
  const d = await db.query.deals.findFirst({ where: eq(schema.deals.id, v.dealId) });
  const r = d && await db.query.requests.findFirst({ where: eq(schema.requests.id, d.requestId) });
  const c = d && await db.query.users.findFirst({ where: eq(schema.users.id, d.creatorId), columns: { handle: true } });
  if (v.availableUntil && v.availableUntil < new Date()) return <div className="wrap"><div className="card empty" style={{ maxWidth: 480, margin: "40px auto" }}><b className="t-h3">Access ended</b><p className="muted t-sm">The creator set a vault period, and it is over.</p><Link href="/vault" className="btn btn-secondary">Back to vault</Link></div></div>;
  return <Viewer items={siblings} start={Math.max(0, siblings.findIndex((s) => s.id === id))} title={r?.title ?? ""} by={c?.handle ?? ""} handle={u.handle} until={v.availableUntil?.toISOString() ?? null} />;
}
