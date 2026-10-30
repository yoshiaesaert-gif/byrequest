import { requireUser } from "@/server/auth";
import { startUpload } from "@/server/chunks";
import { RuleError } from "@/domain/rules";

/* Starts a resumable upload. target: "album" or "delivery:<dealId>". */
export async function POST(req: Request) {
  const u = await requireUser();
  try {
    const b = (await req.json()) as { name?: string; type?: string; size?: number; target?: string; extra?: Record<string, string> };
    if (!b.target || !/^(album|delivery:[0-9a-f-]{36})$/.test(b.target)) throw new RuleError("Unknown upload.");
    const id = await startUpload(u.id, { name: String(b.name ?? "file").slice(0, 120), type: String(b.type ?? ""), size: Number(b.size), target: b.target, extra: Object.fromEntries(Object.entries(b.extra ?? {}).map(([k, v]) => [k.slice(0, 20), String(v).slice(0, 40)])) });
    return Response.json({ ok: true, id });
  } catch (e) { return Response.json({ ok: false, error: e instanceof RuleError ? e.message : "Upload failed. Try again." }, { status: 400 }); }
}
