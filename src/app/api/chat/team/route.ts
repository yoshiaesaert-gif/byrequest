import { requireStaff } from "@/server/admin";
import { teamTyping, creatorTyping, type Kind } from "@/server/chat";
import { teamSend, teamOfferSend } from "@/server/teamchat";
import { RuleError } from "@/domain/rules";

/* Back office: the team profile is typing (POST), or is the creator typing (GET). */
export async function POST(req: Request) {
  const { user } = await requireStaff();
  const { kind, id, text } = (await req.json()) as { kind: Kind; id: string; text?: string };
  if ((kind !== "deal" && kind !== "offer") || !/^[0-9a-f-]{36}$/.test(id)) return Response.json({ ok: false }, { status: 400 });
  if (typeof text !== "string") { await teamTyping(kind, id); return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }); }
  try {
    if (kind === "offer") await teamOfferSend(user.id, id, text); else await teamSend(user.id, id, text);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof RuleError) return Response.json({ ok: false, error: e.message }, { status: 400 });
    console.error("team chat send", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: "That did not work. Try again." }, { status: 500 });
  }
}
export async function GET(req: Request) {
  await requireStaff();
  const q = new URL(req.url).searchParams, kind = q.get("kind") as Kind, id = q.get("id") ?? "", creator = q.get("creator") ?? "";
  if ((kind !== "deal" && kind !== "offer") || !/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f-]{36}$/.test(creator)) return Response.json({ typing: false });
  return Response.json({ typing: await creatorTyping(kind, id, creator) }, { headers: { "Cache-Control": "no-store" } });
}
