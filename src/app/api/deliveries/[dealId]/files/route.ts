import { currentUser } from "@/server/auth";
import { stageFile, unstageFile } from "@/server/deals";
import { RuleError } from "@/domain/rules";

/* One delivery file per request, so the browser can upload several in parallel with their own progress. */
export async function POST(req: Request, ctx: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await ctx.params;
  const u = await currentUser();
  if (!u) return Response.json({ ok: false, error: "Sign in again." }, { status: 401 });
  try {
    const f = (await req.formData()).get("file");
    if (!(f instanceof File) || !f.size) return Response.json({ ok: false, error: "Choose a file first." }, { status: 400 });
    return Response.json({ ok: true, item: await stageFile(u.id, dealId, f) });
  } catch (e) {
    if (!(e instanceof RuleError)) console.error("delivery file failed:", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: e instanceof RuleError ? e.message : "Upload failed. Try again." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const u = await currentUser();
  if (!u) return Response.json({ ok: false }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (id) await unstageFile(u.id, id).catch(() => null);
  return Response.json({ ok: true });
}
