import { currentUser } from "@/server/auth";
import { linkAction } from "@/server/referrals";

/* The invite page tells us when the owner copies, shares or shows their link. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return Response.json({ ok: false }, { status: 401 });
  const { kind, ch } = await req.json().catch(() => ({}));
  if (kind === "copy" || kind === "share" || kind === "qr" || kind === "code") await linkAction(u.id, kind, typeof ch === "string" ? ch.slice(0, 8) : undefined).catch(() => {});
  return Response.json({ ok: true });
}
