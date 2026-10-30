import { currentUser } from "@/server/auth";
import { chatState, postMessage, setTyping, type Kind } from "@/server/chat";
import { RuleError } from "@/domain/rules";

/* The open chat talks to this: GET every few seconds for new messages, read ticks and "typing", POST to send or to say "typing". */
const NO = { "Cache-Control": "no-store" };
type Ctx = { params: Promise<{ kind: string; id: string }> };
const kindOf = (k: string): Kind | null => (k === "deal" || k === "offer" ? k : null);

export async function GET(req: Request, ctx: Ctx) {
  const { kind, id } = await ctx.params;
  const u = await currentUser();
  const k = kindOf(kind);
  if (!u) return Response.json({ error: "auth" }, { status: 401, headers: NO });
  if (!k || !/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "not found" }, { status: 404, headers: NO });
  const s = await chatState(u.id, k, id, new URL(req.url).searchParams.get("v") ?? undefined);
  return s ? Response.json(s, { headers: NO }) : Response.json({ error: "not found" }, { status: 404, headers: NO });
}

export async function POST(req: Request, ctx: Ctx) {
  const { kind, id } = await ctx.params;
  const u = await currentUser();
  const k = kindOf(kind);
  if (!u) return Response.json({ error: "auth" }, { status: 401, headers: NO });
  if (!k || !/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "not found" }, { status: 404, headers: NO });
  try {
    const b = (await req.json()) as { typing?: boolean; text?: string; nonce?: string; body?: string };
    if (b.typing) { await setTyping(u.id, k, id); return Response.json({ ok: true }, { headers: NO }); }
    const m = await postMessage(u.id, k, id, b);
    return Response.json({ ok: true, ...m }, { headers: NO });
  } catch (e) {
    if (e instanceof RuleError) return Response.json({ ok: false, error: e.message }, { status: 400, headers: NO });
    console.error("chat", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: "That did not work. Try again." }, { status: 500, headers: NO });
  }
}
