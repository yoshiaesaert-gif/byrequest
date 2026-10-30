import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError } from "@/domain/rules";
import { ingest, remove } from "./media";
import { notify } from "./deals";
import { requireCap, log } from "./onboarding";
import { REVIEW_MODE } from "@/config/compliance";
import { blockedEither } from "./blocks";

const { previewAlbums, previewPhotos, offers, requests, media } = schema;

/* Preview album, version 2.
   The creator keeps one hidden album with a few photos of their own choice (looks, body, intimate).
   Every photo is reviewed before it can be shared. A buyer who is choosing can ask a candidate
   "can I see more?". The creator shares the album, or not. The buyer then sees each photo once, for
   10 seconds, with their own name as a watermark; after that the share is closed for good. Nothing
   is copied: the watermarked image is made in memory for each view and never stored.
   A buyer can ask at most PREVIEW_LIMIT candidates per request, so a preview is a way to choose,
   never a free gallery. */
export const PHOTO_SECONDS = 10;
export const PREVIEW_LIMIT = 5;
export const ALBUM_MAX = 6;
const GRACE_MS = 4000;            // a photo may load again within its own 10 seconds (slow network), never after

/* ---------- the creator's own album ---------- */
export async function myPhotos(creatorId: string) {
  return db.select({ id: previewPhotos.id, mediaId: previewPhotos.mediaId, kind: previewPhotos.kind, status: previewPhotos.status }).from(previewPhotos).where(eq(previewPhotos.creatorId, creatorId)).orderBy(previewPhotos.createdAt);
}

export async function addPhotos(creatorId: string, files: File[], kind: "looks" | "body" | "intimate") {
  await requireCap(creatorId, "upload");
  const have = (await myPhotos(creatorId)).filter((p) => p.status !== "rejected").length;
  const imgs = files.filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, ALBUM_MAX - have));
  if (!imgs.length) throw new RuleError(have >= ALBUM_MAX ? "Your album is full. Remove a photo first." : "Add at least one photo.");
  const stored: Awaited<ReturnType<typeof ingest>>[] = []; for (const f of imgs) stored.push(await ingest(f));
  const ids = await db.transaction(async (tx) => {
    const rows = await tx.insert(media).values(stored.map((s) => ({ ownerId: creatorId, storageKey: s.key, mime: s.mime, bytes: s.bytes, width: s.width ?? null, height: s.height ?? null }))).returning();
    const ph = await tx.insert(previewPhotos).values(rows.map((r) => ({ creatorId, mediaId: r.id, kind }))).returning({ id: previewPhotos.id });
    await log(tx, `user:${creatorId}`, "album.photos_added", creatorId, { n: ph.length, kind });
    return ph.map((p) => p.id);
  });
  if (REVIEW_MODE === "test_auto") for (const id of ids) await reviewPhoto(id, "approved", "system:test_auto");
  return ids.length;
}

export async function removePhoto(creatorId: string, photoId: string) {
  const p = await db.query.previewPhotos.findFirst({ where: and(eq(previewPhotos.id, photoId), eq(previewPhotos.creatorId, creatorId)) });
  if (!p) throw new RuleError("Not found.");
  const m = await db.query.media.findFirst({ where: eq(media.id, p.mediaId) });
  await db.delete(previewPhotos).where(eq(previewPhotos.id, photoId));
  if (m) { await remove(m.storageKey); await db.delete(media).where(eq(media.id, m.id)); }
  await log(db, `user:${creatorId}`, "album.photo_removed", creatorId, { photoId });
}

/* Staff review per photo. A rejected photo is deleted from storage straight away. */
export async function reviewPhoto(photoId: string, outcome: "approved" | "rejected", reviewer: string) {
  const p = await db.query.previewPhotos.findFirst({ where: eq(previewPhotos.id, photoId) });
  if (!p || p.status !== "in_review") throw new RuleError("This photo is not waiting for review.");
  if (outcome === "rejected") {
    const m = await db.query.media.findFirst({ where: eq(media.id, p.mediaId) });
    await db.update(previewPhotos).set({ status: "rejected" }).where(eq(previewPhotos.id, photoId));
    if (m) await remove(m.storageKey);
    await db.insert(schema.notifications).values({ userId: p.creatorId, title: "A preview photo was not approved", body: "It does not follow the content rules and was deleted.", href: "/studio#album" });
  } else {
    await db.update(previewPhotos).set({ status: "approved" }).where(eq(previewPhotos.id, photoId));
  }
  await log(db, reviewer, `album.photo_${outcome}`, p.creatorId, { photoId });
}

/* ---------- asking, sharing, viewing ---------- */
export async function asked(buyerId: string, requestId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(previewAlbums).innerJoin(offers, eq(offers.id, previewAlbums.offerId))
    .where(and(eq(previewAlbums.buyerId, buyerId), eq(offers.requestId, requestId), ne(previewAlbums.status, "declined")));
  return r?.n ?? 0;
}

export async function requestAlbum(buyerId: string, offerId: string) {
  const o = await db.query.offers.findFirst({ where: eq(offers.id, offerId) });
  const r = o && await db.query.requests.findFirst({ where: eq(requests.id, o.requestId) });
  if (!o || !r || r.buyerId !== buyerId || o.status !== "pending" || r.status !== "open") throw new RuleError("You can ask for a preview only while choosing between offers.");
  if (await blockedEither(buyerId, o.creatorId)) throw new RuleError("You can ask for a preview only while choosing between offers.");
  if ((await asked(buyerId, r.id)) >= PREVIEW_LIMIT) throw new RuleError("You already asked 5 candidates for a preview on this request.");
  await db.transaction(async (tx) => {
    await tx.insert(previewAlbums).values({ offerId, buyerId, creatorId: o.creatorId, kind: "looks" });
    await notify(tx, o.creatorId, "Preview request", "A buyer who is choosing would like to see a bit more.", "/studio#previews");
    await log(tx, `user:${buyerId}`, "album.requested", o.creatorId, { offerId });
  }).catch((e) => { if (String(e).includes("album_one_per_offer")) throw new RuleError("You already asked this candidate."); throw e; });
}

/* The creator shares the approved photos they pick, or says no. */
export async function answerAlbum(creatorId: string, albumId: string, share: string[] | null) {
  const a = await db.query.previewAlbums.findFirst({ where: eq(previewAlbums.id, albumId) });
  if (!a || a.creatorId !== creatorId || a.status !== "requested") throw new RuleError("This request is no longer open.");
  if (!share) {
    await db.update(previewAlbums).set({ status: "declined" }).where(eq(previewAlbums.id, albumId));
    await log(db, `user:${creatorId}`, "album.declined", a.buyerId, { albumId });
    return;
  }
  await requireCap(creatorId, "upload");
  const ok = share.length ? await db.select({ mediaId: previewPhotos.mediaId }).from(previewPhotos).where(and(eq(previewPhotos.creatorId, creatorId), eq(previewPhotos.status, "approved"), inArray(previewPhotos.id, share))) : [];
  if (!ok.length) throw new RuleError("Pick at least one approved photo from your album.");
  await db.transaction(async (tx) => {
    await tx.update(previewAlbums).set({ status: "ready", mediaIds: ok.map((x) => x.mediaId), views: {} }).where(eq(previewAlbums.id, albumId));
    await notify(tx, a.buyerId, "A preview is ready", `Each photo shows once, for ${PHOTO_SECONDS} seconds.`, `/albums/${albumId}`);
    await log(tx, `user:${creatorId}`, "album.shared", a.buyerId, { albumId, photos: ok.length });
  });
}

export async function openAlbum(buyerId: string, albumId: string) {
  const a = await db.query.previewAlbums.findFirst({ where: eq(previewAlbums.id, albumId) });
  if (!a || a.buyerId !== buyerId) throw new RuleError("Not found.");
  if (a.status === "ready") {
    const openedAt = new Date();
    await db.update(previewAlbums).set({ status: "opened", openedAt }).where(eq(previewAlbums.id, albumId));
    await log(db, `user:${buyerId}`, "album.opened", a.creatorId, { albumId });
    return { ...a, status: "opened" as const, openedAt };
  }
  return a;
}

/* Serving one photo: only to this buyer, only while the share is open, and each photo only during
   its own 10 seconds. The first request starts that photo's clock; after it, the photo is gone. */
export async function viewPhoto(buyerId: string, albumId: string, n: number, now = new Date()) {
  const a = await db.query.previewAlbums.findFirst({ where: eq(previewAlbums.id, albumId) });
  if (!a || a.buyerId !== buyerId) return { status: 404 as const };
  if (a.status !== "opened" || !Number.isInteger(n) || n < 0 || n >= a.mediaIds.length) return { status: 410 as const };
  const seen = a.views[String(n)];
  if (seen && now.getTime() - new Date(seen).getTime() > PHOTO_SECONDS * 1000 + GRACE_MS) return { status: 410 as const };
  if (!seen) {
    // Photos show in order: the one before must have had its turn.
    if (n > 0 && !a.views[String(n - 1)]) return { status: 409 as const };
    await db.update(previewAlbums).set({ views: sql`${previewAlbums.views} || ${JSON.stringify({ [String(n)]: now.toISOString() })}::jsonb` }).where(eq(previewAlbums.id, albumId));
  }
  const m = await db.query.media.findFirst({ where: eq(media.id, a.mediaIds[n]) });
  return m ? { status: 200 as const, storageKey: m.storageKey, left: Math.max(0, PHOTO_SECONDS * 1000 - (seen ? now.getTime() - new Date(seen).getTime() : 0)) } : { status: 404 as const };
}

/* Closes shares whose photos have all had their turn (or that were left open), so nothing stays
   reachable. The creator's own album is not touched. */
export async function closeShares(now = new Date()) {
  const open = await db.select().from(previewAlbums).where(eq(previewAlbums.status, "opened"));
  let closed = 0;
  for (const a of open) {
    const total = a.mediaIds.length * PHOTO_SECONDS * 1000 + 60_000;
    const allSeen = a.mediaIds.every((_, i) => { const v = a.views[String(i)]; return v && now.getTime() - new Date(v).getTime() > PHOTO_SECONDS * 1000 + GRACE_MS; });
    if (allSeen || (a.openedAt && now.getTime() - a.openedAt.getTime() > total)) {
      await db.update(previewAlbums).set({ status: "gone", mediaIds: [] }).where(eq(previewAlbums.id, a.id));
      closed++;
    }
  }
  return closed;
}

export async function closeShare(buyerId: string, albumId: string) {
  await db.update(previewAlbums).set({ status: "gone", mediaIds: [] }).where(and(eq(previewAlbums.id, albumId), eq(previewAlbums.buyerId, buyerId), eq(previewAlbums.status, "opened")));
}
