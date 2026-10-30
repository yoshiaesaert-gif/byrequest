import { revalidatePath } from "next/cache";
import { requireCreator } from "@/server/auth";
import { addPhotos } from "@/server/albums";
import { RuleError } from "@/domain/rules";

/* Upload to the private preview album. A plain route, so an open tab keeps working across new releases. */
export async function POST(req: Request) {
  const u = await requireCreator();
  try {
    const f = await req.formData();
    const files = f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
    const kind = (["looks", "body", "intimate"] as const).find((k) => k === f.get("kind")) ?? "looks";
    const n = await addPhotos(u.id, files, kind);
    revalidatePath("/studio");
    return Response.json({ ok: true, msg: n === 1 ? "Added. It is checked before it can be shared." : "Added. They are checked before they can be shared." });
  } catch (e) {
    const msg = e instanceof RuleError ? e.message : e instanceof Error && /not supported/.test(e.message) ? "This file type is not supported. Use a photo (JPG, PNG, HEIC) or a video (MP4, MOV)." : "Upload failed. Please try again.";
    if (!(e instanceof RuleError)) console.error("album upload failed:", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}
