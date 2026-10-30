import { currentUser } from "@/server/auth";
import { deliver } from "@/server/deals";
import { RuleError } from "@/domain/rules";

/* Delivery upload. Access rules are enforced inside deliver(): the creator must be fully
   approved, and the files must pass the technical check before anything is stored for review. */
export async function POST(req: Request, ctx: RouteContext<"/api/deliveries/[dealId]">) {
  const { dealId } = await ctx.params;
  const u = await currentUser();
  if (!u) return Response.json({ ok: false, error: "Sign in again." }, { status: 401 });
  try {
    const f = await req.formData();
    const files = f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
    if (!files.length) return Response.json({ ok: false, error: "Choose a file first." }, { status: 400 });
    const r = await deliver(u.id, dealId, files, { onlyCreator: f.get("onlyCreator") === "yes", participantIds: f.getAll("participant").map(String).filter(Boolean) });
    return Response.json(r.ok ? { ok: true, lines: r.lines } : { ok: false, error: "This upload cannot be sent.", lines: r.lines });
  } catch (e) {
    if (e instanceof RuleError) return Response.json({ ok: false, error: e.message }, { status: 400 });
    console.error("delivery upload failed:", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: "Upload failed. Try again." }, { status: 500 });
  }
}
