import { requireUser } from "@/server/auth";
import { reportIssue } from "@/server/issues";
import { ask, botReady, type Turn } from "@/server/helpbot";
import { RuleError } from "@/domain/rules";

/* The help popup. With the assistant on, it answers and files problems itself; without it, what people write goes straight to the team. */
const used = new Map<string, number>();
const DAY = () => new Date().toISOString().slice(0, 10);

export async function POST(req: Request) {
  const u = await requireUser();
  const b = (await req.json().catch(() => null)) as { turns?: Turn[]; page?: string; escalate?: boolean; context?: Record<string, unknown> } | null;
  const turns = (b?.turns ?? []).filter((x) => (x.role === "user" || x.role === "assistant") && typeof x.content === "string").slice(-10).map((x) => ({ role: x.role, content: x.content.slice(0, 1000) }));
  if (!turns.length || (!b?.escalate && turns[turns.length - 1].role !== "user")) return Response.json({ error: "Tell us what went wrong." }, { status: 400 });
  const ctxRaw = JSON.stringify(b?.context ?? {});
  const context = { ...(ctxRaw.length < 6000 ? b?.context ?? {} : {}), conversation: turns.map((x) => `${x.role}: ${x.content}`).join("\n").slice(-1500) };
  const page = String(b?.page ?? "");
  const file = async (message: string) => { await reportIssue(u.id, u.handle, { message, page, context }); };
  try {
    if (b?.escalate) { await file((turns.filter((x) => x.role === "user").pop()?.content ?? "").slice(0, 600) || "Asked to pass the conversation to the team"); return Response.json({ reply: null, filed: true }); }
    if (!botReady()) { await file(turns[turns.length - 1].content); return Response.json({ reply: null, filed: true }); }
    const k = `${u.id}:${DAY()}`; const n = (used.get(k) ?? 0) + 1; used.set(k, n);
    if (used.size > 5000) used.clear();
    if (n > 40) { await file(turns[turns.length - 1].content); return Response.json({ reply: null, filed: true }); }
    const out = await ask(turns);
    if (out.file) { await file(out.file); return Response.json({ reply: out.text || null, filed: true }); }
    return Response.json({ reply: out.text || null, filed: false, empty: !out.text });
  } catch (e) {
    if (e instanceof RuleError) return Response.json({ error: e.message }, { status: 400 });
    // The assistant is down: never lose the message, give it to the team.
    console.error("help bot failed:", e instanceof Error ? e.message : e, "key set:", botReady());
    try { await file(turns[turns.length - 1].content); return Response.json({ reply: null, filed: true }); } catch { return Response.json({ error: "That did not work. Please try again." }, { status: 500 }); }
  }
}
