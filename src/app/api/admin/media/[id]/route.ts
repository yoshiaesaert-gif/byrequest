import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";
import { log } from "@/server/onboarding";
import { watermarkImage, localFile } from "@/server/media";
import { readFile } from "node:fs/promises";

/* Reviewers see files only through this endpoint: staff role required, every view logged. */
export async function GET(_: Request, ctx: RouteContext<"/api/admin/media/[id]">) {
  const { id } = await ctx.params;
  const u = await currentUser();
  const st = u && await db.query.staff.findFirst({ where: eq(schema.staff.userId, u.id) });
  if (!u || !st || st.role === "none") return new Response("Forbidden", { status: 403 });
  const m = await db.query.media.findFirst({ where: eq(schema.media.id, id) });
  if (!m) return new Response("Not found", { status: 404 });
  await log(db, `staff:${u.id}`, "review.media_viewed", m.ownerId, { mediaId: id });
  const body = m.mime.startsWith("image/") ? await watermarkImage(m.storageKey, `review · ${u.handle}`) : await readFile(await localFile(m.storageKey));
  return new Response(new Uint8Array(body), { headers: { "Content-Type": m.mime.startsWith("image/") ? "image/jpeg" : m.mime, "Cache-Control": "private, no-store", "Content-Disposition": "inline" } });
}
