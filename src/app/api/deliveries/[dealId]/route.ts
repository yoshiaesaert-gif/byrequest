import { currentUser } from "@/server/auth";
import { deliver, deliverStaged } from "@/server/deals";
import { RuleError } from "@/domain/rules";

/* Delivery upload. Access rules are enforced inside deliver(): the creator must be fully
   approved, and the files must pass the technical check before anything is stored for review. */
export async function POST(req: Request, ctx: RouteContext<"/api/deliveries/[dealId]">) {
  const { dealId } = await ctx.params;
  const u = await currentUser();
  if (!u) return Response.json({ ok: false, error: "Sign in again." }, { status: 401 });
  try {
    // The fast path: files were uploaded one by one already, this sends them as the delivery.
    if (req.headers.get("content-type")?.includes("application/json")) {
      const b = (await req.json()) as { mediaIds?: string[]; onlyCreator?: boolean; participantIds?: string[] };
      const r = await deliverStaged(u.id, dealId, (b.mediaIds ?? []).map(String), { onlyCreator: !!b.onlyCreator, participantIds: (b.participantIds ?? []).map(String) });
      return Response.json(r.ok ? { ok: true, lines: r.lines } : { ok: false, error: "This upload cannot be sent.", lines: r.lines });
    }
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
