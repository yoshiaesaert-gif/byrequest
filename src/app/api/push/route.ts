import { requireUser } from "@/server/auth";
import { pushKey, subscribe, unsubscribe } from "@/server/push";

/* GET: the public key the browser needs to subscribe. POST: save this device. DELETE: forget it. */
export async function GET() { return Response.json({ key: pushKey() }, { headers: { "Cache-Control": "no-store" } }); }
export async function POST(req: Request) {
  const u = await requireUser();
  const b = (await req.json().catch(() => null)) as { sub?: { endpoint: string; keys: { p256dh: string; auth: string } }; app?: boolean } | null;
  if (!b?.sub) return Response.json({ error: "No subscription" }, { status: 400 });
  try { await subscribe(u.id, b.sub, req.headers.get("user-agent") ?? "", !!b.app); } catch { return Response.json({ error: "Not a valid subscription" }, { status: 400 }); }
  return Response.json({ ok: true });
}
export async function DELETE(req: Request) {
  const u = await requireUser();
  const b = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (b?.endpoint) await unsubscribe(u.id, b.endpoint);
  return Response.json({ ok: true });
}
