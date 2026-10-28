import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError } from "@/domain/rules";
import path from "node:path";
import sharp from "sharp";
import type { FileFacts } from "@/domain/rules";

const run = promisify(execFile);
const ROOT = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage");

/* Files live on local disk while they are processed and served. With S3_BUCKET set (Cloudflare R2,
   Backblaze B2 or any S3 compatible store) every finished file is also encrypted with AES 256 GCM
   (STORAGE_KEY) and kept in the bucket, so deliveries survive restarts of a server without a
   permanent disk. A file missing locally is fetched back from the bucket on first use. */
const BUCKET = process.env.S3_BUCKET;
const s3 = BUCKET ? new AwsClient({ accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "", service: "s3", region: process.env.S3_REGION || "auto" }) : null;
const objectUrl = (key: string) => `${process.env.S3_ENDPOINT?.replace(/\/$/, "")}/${BUCKET}/${key}`;
const cryptKey = () => createHash("sha256").update(process.env.STORAGE_KEY || process.env.SESSION_SECRET || "dev").digest();
export function seal(buf: Buffer) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", cryptKey(), iv);
  const body = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]);
}
export function open(buf: Buffer) {
  const d = createDecipheriv("aes-256-gcm", cryptKey(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
}
async function upload(key: string) {
  if (!s3) return;
  const r = await s3.fetch(objectUrl(key), { method: "PUT", body: new Uint8Array(seal(await readFile(filePath(key)))), headers: { "content-type": "application/octet-stream" } });
  if (!r.ok) throw new Error(`storage upload ${r.status}`);
}
/* The local path of a stored file, restored from the bucket when this server does not have it. */
export async function localFile(key: string) {
  const p = filePath(key);
  if (!s3 || (await stat(p).catch(() => null))) return p;
  const r = await s3.fetch(objectUrl(key));
  if (!r.ok) throw new Error(`storage fetch ${r.status}`);
  await mkdir(path.dirname(p), { recursive: true });
  const tmp = `${p}.${randomUUID()}.part`;
  await writeFile(tmp, open(Buffer.from(await r.arrayBuffer())));
  await rename(tmp, p);
  return p;
}

export async function put(buf: Buffer, ext: string) {
  const key = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const p = filePath(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, buf);
  return key;
}
export function filePath(key: string) {
  const p = path.resolve(ROOT, key);
  if (!p.startsWith(ROOT + path.sep)) throw new Error("bad storage key");
  return p;
}
export async function remove(key: string) {
  await rm(filePath(key), { force: true });
  if (s3) await s3.fetch(objectUrl(key), { method: "DELETE" }).catch(() => null);
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav", "audio/webm": "webm" };
export const ACCEPTED = Object.keys(EXT);

export type Stored = FileFacts & { key: string; bytes: number };

/* Strips location, device and time data, then reads only technical facts. Nobody looks at the content. */
export async function ingest(file: File): Promise<Stored> {
  const ext = EXT[file.type];
  if (!ext) throw new Error(`File type ${file.type || "unknown"} is not supported.`);
  const raw = Buffer.from(await file.arrayBuffer());
  await refuseBlocked(raw, file.type.startsWith("image/"));
  if (file.type.startsWith("image/")) {
    const clean = await sharp(raw).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer(); // re-encode drops EXIF and GPS
    const meta = await sharp(clean).metadata();
    const key = await put(clean, "jpg");
    await upload(key);
    return { key, mime: "image/jpeg", bytes: clean.length, width: meta.width ?? 0, height: meta.height ?? 0 };
  }
  const key = await put(raw, ext);
  const src = filePath(key), out = src.replace(/\.(\w+)$/, ".clean.$1");
  await run("ffmpeg", ["-y", "-v", "error", "-i", src, "-map_metadata", "-1", "-map_chapters", "-1", "-c", "copy", out]);
  await rename(out, src);
  await upload(key);
  const facts = await probe(src);
  const meanVolumeDb = file.type.startsWith("audio/") ? await meanVolume(src) : null;
  return { key, mime: file.type, bytes: (await stat(src)).size, ...facts, meanVolumeDb };
}

async function probe(p: string) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", p]);
  const j = JSON.parse(stdout) as { format?: { duration?: string }; streams?: { codec_type: string; width?: number; height?: number }[] };
  const v = j.streams?.find((s) => s.codec_type === "video");
  return { durationSec: Math.floor(Number(j.format?.duration ?? 0)), width: v?.width ?? null, height: v?.height ?? null };
}

async function meanVolume(p: string) {
  const { stderr } = await run("ffmpeg", ["-v", "info", "-i", p, "-af", "volumedetect", "-f", "null", "-"]).catch((e) => e);
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(String(stderr));
  return m ? Number(m[1]) : -99;
}

/* Visible watermark for still images, burned in per view. The invisible forensic code is added by
   the vendor integration (see forensic.ts); this layer is the deterrent people can see. */
export async function watermarkImage(key: string, label: string) {
  const img = sharp(await localFile(key));
  const { width = 1200, height = 1600 } = await img.metadata();
  const fs = Math.round(Math.max(width, height) / 42);
  const rows = Math.ceil(height / (fs * 5)) + 2, cols = Math.ceil(width / (fs * 12)) + 2;
  let t = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    t += `<text x="${c * fs * 12 + (r % 2) * fs * 6}" y="${r * fs * 5}" font-size="${fs}">${esc(label)}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g transform="rotate(-24 ${width / 2} ${height / 2})" fill="#fff" fill-opacity=".16" font-family="Arial" font-weight="700">${t}</g></svg>`;
  return img.composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 82 }).toBuffer();
}
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/* ---------- re-upload block ----------
   When content is removed after a removal request or a report, its fingerprints go on a block
   list: an exact hash for every file and a difference hash for images, which survives resizing
   and recompression. A new upload that matches is refused. */
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
async function dhash(b: Buffer) {
  const px = await sharp(b).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}
const hamming = (a: string, b: string) => { let x = BigInt("0x" + a) ^ BigInt("0x" + b), n = 0; const one = BigInt(1), zero = BigInt(0); while (x > zero) { n += Number(x & one); x >>= one; } return n; };

async function refuseBlocked(raw: Buffer, image: boolean) {
  const h = sha(raw);
  if (await db.query.blockedHashes.findFirst({ where: eq(schema.blockedHashes.sha256, h) })) throw new RuleError("This file was removed from ByRequest and cannot be uploaded again.");
  if (!image) return;
  const d = await dhash(raw);
  const list = await db.select({ dhash: schema.blockedHashes.dhash }).from(schema.blockedHashes).where(isNotNull(schema.blockedHashes.dhash));
  if (list.some((r) => hamming(r.dhash!, d) <= 6)) throw new RuleError("This file was removed from ByRequest and cannot be uploaded again.");
}

export async function blockFile(key: string, mime: string, reason: string) {
  const buf = await localFile(key).then((p) => readFile(p)).catch(() => null);
  if (!buf) return;
  await db.insert(schema.blockedHashes).values({ sha256: sha(buf), dhash: mime.startsWith("image/") ? await dhash(buf) : null, reason: reason.slice(0, 200) }).onConflictDoNothing();
}
