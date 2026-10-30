import { requireStaff } from "@/server/admin";
import { staffState, type Kind } from "@/server/chat";

/* Back office chat: the conversation as the team profile, refreshed every few seconds. */
export async function GET(req: Request) {
  const { user } = await requireStaff();
  const q = new URL(req.url).searchParams, kind = q.get("kind") as Kind, id = q.get("id") ?? "";
  if ((kind !== "deal" && kind !== "offer") || !/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "not found" }, { status: 404 });
  const s = await staffState(user.id, kind, id, q.get("v") ?? undefined);
  return s ? Response.json(s, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "not found" }, { status: 404 });
}
