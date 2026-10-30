import { currentUser } from "@/server/auth";
import { viewPhoto, viewerFor } from "@/server/albums";
import { streamMedia, watermarkImage } from "@/server/media";

/* One preview photo: only to the buyer it was shared with, only during its own 10 seconds, with their
   name as a watermark made fresh for this view. Never cached, never stored. */
export async function GET(req: Request, ctx: RouteContext<"/api/album/[id]/[n]">) {
  const { id, n } = await ctx.params;
  const u = await currentUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const v = await viewPhoto(await viewerFor(u.id, id), id, Number(n));
  if (v.status !== 200) return new Response(v.status === 410 ? "Gone" : v.status === 409 ? "Not yet" : "Not found", { status: v.status, headers: { "Cache-Control": "no-store" } });
  // A video plays once, during its own length; the buyer's name is laid over it in the viewer.
  if (v.mime.startsWith("video/")) return streamMedia(v.storageKey, v.mime, req, { "X-Robots-Tag": "noindex" });
  const stamp = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
  const img = await watermarkImage(v.storageKey, `${u.handle} · ${stamp}`);
  return new Response(new Uint8Array(img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store, max-age=0", "Content-Disposition": "inline", "X-Robots-Tag": "noindex", "X-Seconds-Left": String(Math.round(v.left / 1000)) } });
}
