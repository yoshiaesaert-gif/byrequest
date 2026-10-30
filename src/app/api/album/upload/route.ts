import { revalidatePath } from "next/cache";
import { requireCreator } from "@/server/auth";
import { addPhotos, myPhotos, removePhoto } from "@/server/albums";
import { RuleError } from "@/domain/rules";

/* Upload to the private preview album. A plain route, so an open tab keeps working across new releases. */
export async function POST(req: Request) {
  const u = await requireCreator();
  try {
    const f = await req.formData();
    const files = f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
    const kind = (["looks", "body", "intimate"] as const).find((k) => k === f.get("kind")) ?? "looks";
    const ids = await addPhotos(u.id, files, kind);
    revalidatePath("/studio");
    const items = (await myPhotos(u.id)).filter((p) => ids.includes(p.id));
    return Response.json({ ok: true, items });
  } catch (e) {
    const msg = e instanceof RuleError ? e.message : e instanceof Error && /not supported/.test(e.message) ? "This file type is not supported. Use a photo (JPG, PNG, HEIC) or a video (MP4, MOV)." : "Upload failed. Please try again.";
    if (!(e instanceof RuleError)) console.error("album upload failed:", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}

/* Remove one item from the album, right away. */
export async function DELETE(req: Request) {
  const u = await requireCreator();
  const id = new URL(req.url).searchParams.get("id");
  try { if (id) await removePhoto(u.id, id); revalidatePath("/studio"); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ ok: false, error: e instanceof RuleError ? e.message : "Could not remove it. Try again." }, { status: 400 }); }
}
