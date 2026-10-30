import { requireStaff } from "@/server/admin";
import { teamTyping, creatorTyping, type Kind } from "@/server/chat";

/* Back office: the team profile is typing (POST), or is the creator typing (GET). */
export async function POST(req: Request) {
  await requireStaff();
  const { kind, id } = (await req.json()) as { kind: Kind; id: string };
  if ((kind !== "deal" && kind !== "offer") || !/^[0-9a-f-]{36}$/.test(id)) return Response.json({ ok: false }, { status: 400 });
  await teamTyping(kind, id);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
export async function GET(req: Request) {
  await requireStaff();
  const q = new URL(req.url).searchParams, kind = q.get("kind") as Kind, id = q.get("id") ?? "", creator = q.get("creator") ?? "";
  if ((kind !== "deal" && kind !== "offer") || !/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f-]{36}$/.test(creator)) return Response.json({ typing: false });
  return Response.json({ typing: await creatorTyping(kind, id, creator) }, { headers: { "Cache-Control": "no-store" } });
}
