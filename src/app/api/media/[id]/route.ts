import { BUYER_AGE_CHECK } from "@/config/compliance";
import { isAgeVerified } from "@/server/onboarding";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";
import { filePath, watermarkImage } from "@/server/media";
import { forensic } from "@/server/forensic";

/* Vault files are only served to their buyer, inline, never cached, and images carry a
   watermark with the buyer's name burned in per view. There is no download endpoint. */
const PRIVATE = { "Cache-Control": "private, no-store, max-age=0", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" };

export async function GET(req: Request, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  const u = await currentUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const v = await db.query.vaultItems.findFirst({ where: eq(schema.vaultItems.id, id) });
  if (!v || v.buyerId !== u.id) return new Response("Not found", { status: 404 });
  if (BUYER_AGE_CHECK && !(await isAgeVerified(u.id))) return new Response("Confirm your age first", { status: 403 });
  if (v.availableUntil && v.availableUntil < new Date()) return new Response("Access ended", { status: 410 });
  const m = await db.query.media.findFirst({ where: eq(schema.media.id, v.mediaId) });
  if (!m) return new Response("Not found", { status: 404 });

  if (m.mime.startsWith("image/")) {
    const viewNo = v.views + 1;
    await db.update(schema.vaultItems).set({ views: sql`${schema.vaultItems.views} + 1` }).where(eq(schema.vaultItems.id, id));
    const marked = await forensic.embedImage(await watermarkImage(m.storageKey, `${u.handle} · ${id.slice(0, 4).toUpperCase()}`), { vaultItemId: id, buyerId: u.id, viewNo });
    return new Response(new Uint8Array(marked), { headers: { ...PRIVATE, "Content-Type": "image/jpeg" } });
  }

  // Video and audio: byte range streaming so players can seek. The visible name overlay is drawn by the viewer.
  const p = filePath(m.storageKey);
  const size = (await stat(p)).size;
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = Math.min(range[2] ? Number(range[2]) : start + 2 ** 21, size - 1);
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const body = Readable.toWeb(createReadStream(p, { start, end })) as ReadableStream;
    return new Response(body, { status: 206, headers: { ...PRIVATE, "Content-Type": m.mime, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  }
  return new Response(Readable.toWeb(createReadStream(p)) as ReadableStream, { headers: { ...PRIVATE, "Content-Type": m.mime, "Accept-Ranges": "bytes", "Content-Length": String(size) } });
}
