import { requireCreator } from "@/server/auth";
import { saveReview } from "@/server/creatorreviews";
import { RuleError } from "@/domain/rules";

export async function POST(req: Request) {
  const u = await requireCreator();
  const b = (await req.json().catch(() => ({}))) as { stars?: number; quote?: string; mayPublish?: boolean };
  try { await saveReview(u.id, { stars: Number(b.stars), quote: String(b.quote ?? ""), mayPublish: !!b.mayPublish }); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ ok: false, error: e instanceof RuleError ? e.message : "That did not work. Please try again." }, { status: 400 }); }
}
