import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";
import { albumLive, burnAlbum } from "@/server/albums";
import { watermarkImage } from "@/server/media";

/* Preview album photos are served only to the buyer and only during the 60 seconds after opening. */
export async function GET(_: Request, ctx: RouteContext<"/api/album/[id]/[n]">) {
  const { id, n } = await ctx.params;
  const u = await currentUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const a = await db.query.previewAlbums.findFirst({ where: eq(schema.previewAlbums.id, id) });
  if (!a || a.buyerId !== u.id) return new Response("Not found", { status: 404 });
  if (!albumLive(a)) { if (a.status === "opened") await burnAlbum(id); return new Response("Gone", { status: 410 }); }
  const mid = a.mediaIds[Number(n)];
  const m = mid && await db.query.media.findFirst({ where: eq(schema.media.id, mid) });
  if (!m) return new Response("Not found", { status: 404 });
  const img = await watermarkImage(m.storageKey, `${u.handle} · view once`);
  return new Response(new Uint8Array(img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "Content-Disposition": "inline" } });
}
