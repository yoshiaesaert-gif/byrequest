import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";
import { watermarkImage } from "@/server/media";

/* A creator's own preview photo, only for that creator (to manage the album). Marked "your album". */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const u = await currentUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const p = await db.query.previewPhotos.findFirst({ where: and(eq(schema.previewPhotos.id, id), eq(schema.previewPhotos.creatorId, u.id)) });
  const m = p && p.status !== "rejected" ? await db.query.media.findFirst({ where: eq(schema.media.id, p.mediaId) }) : null;
  if (!m) return new Response("Not found", { status: 404 });
  const img = await watermarkImage(m.storageKey, "your album");
  return new Response(new Uint8Array(img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}
