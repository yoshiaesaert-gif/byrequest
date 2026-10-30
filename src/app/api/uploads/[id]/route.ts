import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { finishUpload, putPiece, received } from "@/server/chunks";
import { addPhotos, myPhotos } from "@/server/albums";
import { stageFile } from "@/server/deals";
import { RuleError } from "@/domain/rules";

type Ctx = { params: Promise<{ id: string }> };
const fail = (e: unknown) => {
  if (!(e instanceof RuleError)) console.error("chunked upload failed:", e instanceof Error ? e.message : e);
  return Response.json({ ok: false, error: e instanceof RuleError ? e.message : "Upload failed. Try again." }, { status: 400 });
};

/* How many bytes arrived so far: the browser resumes from here after a dropped connection. */
export async function GET(_: Request, ctx: Ctx) {
  const u = await requireUser();
  try { return Response.json({ ok: true, received: await received(u.id, (await ctx.params).id) }); } catch (e) { return fail(e); }
}

/* One piece: PUT ?offset=N with the raw bytes. */
export async function PUT(req: Request, ctx: Ctx) {
  const u = await requireUser();
  try {
    const offset = Number(new URL(req.url).searchParams.get("offset"));
    const got = await putPiece(u.id, (await ctx.params).id, offset, Buffer.from(await req.arrayBuffer()));
    return Response.json({ ok: true, received: got });
  } catch (e) { return fail(e); }
}

/* Complete: the file goes through exactly the same checks as a normal upload. */
export async function POST(_: Request, ctx: Ctx) {
  const u = await requireUser();
  try {
    const f = await finishUpload(u.id, (await ctx.params).id);
    try {
      if (f.target === "album") {
        const kind = (["looks", "body", "intimate"] as const).find((k) => k === f.extra.kind) ?? "looks";
        const ids = await addPhotos(u.id, [f.file], kind);
        revalidatePath("/studio");
        return Response.json({ ok: true, items: (await myPhotos(u.id)).filter((p) => ids.includes(p.id)) });
      }
      return Response.json({ ok: true, item: await stageFile(u.id, f.target.slice("delivery:".length), f.file) });
    } finally { await f.done(); }
  } catch (e) { return fail(e); }
}
