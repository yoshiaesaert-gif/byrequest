import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError, ALBUM_SECONDS } from "@/domain/rules";
import { ingest, remove } from "./media";
import { notify } from "./deals";
import { requireCap, log } from "./onboarding";
import { REVIEW_MODE } from "@/config/compliance";
import { blockedEither } from "./blocks";

const { previewAlbums, offers, requests, media } = schema;

/* View once preview album: requested by a buyer while choosing, sent or declined by the creator,
   opened once for 60 seconds, then deleted on both sides. One per offer. */
export async function requestAlbum(buyerId: string, offerId: string, kind: "looks" | "body" | "intimate") {
  const o = await db.query.offers.findFirst({ where: eq(offers.id, offerId) });
  const r = o && await db.query.requests.findFirst({ where: eq(requests.id, o.requestId) });
  if (!o || !r || r.buyerId !== buyerId || o.status !== "pending") throw new RuleError("You can ask for a preview album only while choosing between offers.");
  if (await blockedEither(buyerId, o.creatorId)) throw new RuleError("You can ask for a preview album only while choosing between offers.");
  await db.transaction(async (tx) => {
    await tx.insert(previewAlbums).values({ offerId, buyerId, creatorId: o.creatorId, kind });
    await notify(tx, o.creatorId, "Preview request", "A buyer asked for a preview album.", "/studio");
  }).catch((e) => { if (String(e).includes("album_one_per_offer")) throw new RuleError("You already asked for a preview album on this offer."); throw e; });
}

export async function answerAlbum(creatorId: string, albumId: string, files: File[] | null) {
  const a = await db.query.previewAlbums.findFirst({ where: eq(previewAlbums.id, albumId) });
  if (!a || a.creatorId !== creatorId || a.status !== "requested") throw new RuleError("This request is no longer open.");
  if (files) await requireCap(creatorId, "upload");
  if (!files) {
    await db.update(previewAlbums).set({ status: "declined" }).where(eq(previewAlbums.id, albumId));
    return;
  }
  const imgs = files.filter((f) => f.type.startsWith("image/")).slice(0, 5);
  if (!imgs.length) throw new RuleError("Add at least one photo.");
  const stored: Awaited<ReturnType<typeof ingest>>[] = [];
  for (const f of imgs) stored.push(await ingest(f));
  await db.transaction(async (tx) => {
    const rows = await tx.insert(media).values(stored.map((s) => ({ ownerId: creatorId, storageKey: s.key, mime: s.mime, bytes: s.bytes, width: s.width ?? null, height: s.height ?? null }))).returning();
    // Preview photos are content too: they wait for review before the buyer can open them.
    await tx.update(previewAlbums).set({ status: "in_review", mediaIds: rows.map((r) => r.id) }).where(eq(previewAlbums.id, albumId));
    await log(tx, `user:${creatorId}`, "album.submitted", creatorId, { albumId });
  });
  if (REVIEW_MODE === "test_auto") await reviewAlbum(albumId, "approved", "system:test_auto");
}

export async function reviewAlbum(albumId: string, outcome: "approved" | "rejected", reviewer: string) {
  const a = await db.query.previewAlbums.findFirst({ where: eq(previewAlbums.id, albumId) });
  if (!a || a.status !== "in_review") throw new RuleError("This album is not waiting for review.");
  if (outcome === "rejected") { await burnAlbum(albumId); await db.update(previewAlbums).set({ status: "declined" }).where(eq(previewAlbums.id, albumId)); await log(db, reviewer, "album.rejected", a.creatorId, { albumId }); return; }
  await db.transaction(async (tx) => {
    await tx.update(previewAlbums).set({ status: "ready" }).where(eq(previewAlbums.id, albumId));
    await notify(tx, a.buyerId, "Preview album ready", "It opens once, for 60 seconds.", `/albums/${albumId}`);
    await log(tx, reviewer, "album.approved", a.creatorId, { albumId });
  });
}

export async function openAlbum(buyerId: string, albumId: string) {
  const a = await db.query.previewAlbums.findFirst({ where: eq(previewAlbums.id, albumId) });
  if (!a || a.buyerId !== buyerId) throw new RuleError("Not found.");
  if (a.status === "ready") {
    const openedAt = new Date();
    await db.update(previewAlbums).set({ status: "opened", openedAt }).where(eq(previewAlbums.id, albumId));
    return { ...a, status: "opened" as const, openedAt };
  }
  return a;
}

export function albumLive(a: { status: string; openedAt: Date | null }) {
  return a.status === "opened" && !!a.openedAt && Date.now() < a.openedAt.getTime() + ALBUM_SECONDS * 1000;
}

export async function burnAlbum(albumId: string) {
  const a = await db.query.previewAlbums.findFirst({ where: eq(previewAlbums.id, albumId) });
  if (!a || a.status === "gone") return;
  for (const id of a.mediaIds) {
    const m = await db.query.media.findFirst({ where: eq(media.id, id) });
    if (m) { await remove(m.storageKey); await db.delete(media).where(eq(media.id, id)); }
  }
  await db.update(previewAlbums).set({ status: "gone", mediaIds: [] }).where(eq(previewAlbums.id, albumId));
}
