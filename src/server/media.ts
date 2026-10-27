import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import type { FileFacts } from "@/domain/rules";

const run = promisify(execFile);
const ROOT = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage");

/* Local disk storage for development. Production swaps this for S3 compatible storage with
   server side encryption; the rest of the app only uses put, filePath and remove. */
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
export async function remove(key: string) { await rm(filePath(key), { force: true }); }

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav", "audio/webm": "webm" };
export const ACCEPTED = Object.keys(EXT);

export type Stored = FileFacts & { key: string; bytes: number };

/* Strips location, device and time data, then reads only technical facts. Nobody looks at the content. */
export async function ingest(file: File): Promise<Stored> {
  const ext = EXT[file.type];
  if (!ext) throw new Error(`File type ${file.type || "unknown"} is not supported.`);
  const raw = Buffer.from(await file.arrayBuffer());
  if (file.type.startsWith("image/")) {
    const clean = await sharp(raw).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer(); // re-encode drops EXIF and GPS
    const meta = await sharp(clean).metadata();
    const key = await put(clean, "jpg");
    return { key, mime: "image/jpeg", bytes: clean.length, width: meta.width ?? 0, height: meta.height ?? 0 };
  }
  const key = await put(raw, ext);
  const src = filePath(key), out = src.replace(/\.(\w+)$/, ".clean.$1");
  await run("ffmpeg", ["-y", "-v", "error", "-i", src, "-map_metadata", "-1", "-map_chapters", "-1", "-c", "copy", out]);
  await rename(out, src);
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
  const img = sharp(filePath(key));
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
