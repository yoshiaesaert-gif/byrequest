import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile, appendFile, readdir } from "node:fs/promises";
import { RuleError } from "@/domain/rules";

/* Resumable uploads for big files: the browser sends 8 MB pieces; if the connection drops it asks how far we got
   and continues from there. Pieces live in a private temp folder until the file is complete. */
const DIR = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage", "tmp-uploads");
const MAX = 400 * 1024 * 1024;
type Meta = { userId: string; name: string; type: string; size: number; target: string; extra: Record<string, string> };
const safe = (id: string) => { if (!/^[0-9a-f-]{36}$/.test(id)) throw new RuleError("Unknown upload."); return path.join(DIR, id); };

export async function startUpload(userId: string, m: Omit<Meta, "userId">) {
  if (!m.size || m.size > MAX) throw new RuleError("This file is too large.");
  await mkdir(DIR, { recursive: true });
  const id = randomUUID();
  await writeFile(safe(id) + ".json", JSON.stringify({ ...m, userId }));
  await writeFile(safe(id) + ".part", Buffer.alloc(0));
  return id;
}
async function meta(userId: string, id: string) {
  const m = JSON.parse(await readFile(safe(id) + ".json", "utf8").catch(() => { throw new RuleError("Unknown upload."); })) as Meta;
  if (m.userId !== userId) throw new RuleError("Unknown upload.");
  return m;
}
export async function received(userId: string, id: string) { await meta(userId, id); return (await stat(safe(id) + ".part")).size; }
/* A piece is only accepted at the exact offset we have, so a repeated or lost piece can never corrupt the file. */
export async function putPiece(userId: string, id: string, offset: number, piece: Buffer) {
  const m = await meta(userId, id);
  const have = (await stat(safe(id) + ".part")).size;
  if (offset !== have) return have;
  if (have + piece.length > m.size) throw new RuleError("Too much data.");
  await appendFile(safe(id) + ".part", piece);
  return have + piece.length;
}
export async function finishUpload(userId: string, id: string) {
  const m = await meta(userId, id);
  const buf = await readFile(safe(id) + ".part");
  if (buf.length !== m.size) throw new RuleError("The upload is not complete yet.");
  return { file: new File([new Uint8Array(buf)], m.name, { type: m.type }), target: m.target, extra: m.extra, done: () => Promise.all([rm(safe(id) + ".part", { force: true }), rm(safe(id) + ".json", { force: true })]) };
}
/* Pieces of uploads that were never finished are removed after a day. */
export async function sweepUploads() {
  const files = await readdir(DIR).catch(() => [] as string[]);
  let n = 0;
  for (const f of files) { const p = path.join(DIR, f); const s = await stat(p).catch(() => null); if (s && Date.now() - s.mtimeMs > 86400_000) { await rm(p, { force: true }); n++; } }
  return n;
}
