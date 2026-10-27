import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { LOCALES, isLocale, type Locale } from "@/i18n/config";

/* Machine translation of what people write (request titles and details). Pages never wait for a
   translation service: they read the cache, and the minute scheduler fills it. Shown text that is
   a translation is always marked "Automatically translated", with the original one tap away.
   Providers, both free: DeepL API Free when DEEPL_API_KEY is set (500,000 characters a month),
   otherwise the MyMemory free tier. TRANSLATE_PROVIDER=off disables translation. */
const key = (to: string, text: string) => createHash("sha256").update(`${to}|${text}`).digest("hex");

export async function cached(texts: string[], to: Locale) {
  const keys = [...new Set(texts.filter(Boolean))].map((t) => key(to, t));
  if (!keys.length) return new Map<string, string>();
  const rows = await db.select().from(schema.translations).where(inArray(schema.translations.key, keys));
  const byKey = new Map(rows.map((r) => [r.key, r.text]));
  const out = new Map<string, string>();
  for (const t of texts) { const v = byKey.get(key(to, t)); if (v) out.set(t, v); }
  return out;
}

/* Replaces title (and details when present) with the cached translation for the viewer. */
export async function localize<T extends { title: string; details?: string; lang?: string }>(list: T[], to: Locale): Promise<(T & { translated: boolean; original?: { title: string; details?: string } })[]> {
  const need = list.filter((r) => isLocale(r.lang) && r.lang !== to);
  const map = await cached(need.flatMap((r) => [r.title, r.details ?? ""]), to);
  return list.map((r) => {
    if (!isLocale(r.lang) || r.lang === to) return { ...r, translated: false };
    const title = map.get(r.title);
    if (!title) return { ...r, translated: false };
    const details = r.details ? map.get(r.details) ?? r.details : r.details;
    return { ...r, title, details, translated: true, original: { title: r.title, details: r.details } };
  });
}

const DEEPL_LANG: Record<Locale, string> = { nl: "NL", en: "EN-GB", fr: "FR" };

async function deepl(text: string, from: Locale, to: Locale) {
  const k = process.env.DEEPL_API_KEY!;
  const host = k.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const r = await fetch(`${host}/v2/translate`, { method: "POST", signal: AbortSignal.timeout(8000), headers: { authorization: `DeepL-Auth-Key ${k}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ text, source_lang: from.toUpperCase(), target_lang: DEEPL_LANG[to] }) });
  if (!r.ok) throw new Error(`deepl ${r.status}`);
  const j = (await r.json()) as { translations: { text: string }[] };
  return j.translations[0].text;
}

/* MyMemory takes at most 500 bytes per call, so long texts go sentence by sentence. */
async function mymemory(text: string, from: Locale, to: Locale) {
  const parts = text.match(/[^.!?\n]+[.!?\n]*\s*/g) ?? [text];
  const chunks: string[] = []; let cur = "";
  for (const p of parts) { if (Buffer.byteLength(cur + p) > 450 && cur) { chunks.push(cur); cur = ""; } cur += p; }
  if (cur) chunks.push(cur);
  const out: string[] = [];
  for (const c of chunks) {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(c)}&langpair=${from}|${to}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`mymemory ${r.status}`);
    const j = (await r.json()) as { responseStatus: number | string; responseData: { translatedText: string } };
    if (Number(j.responseStatus) !== 200) throw new Error(`mymemory ${j.responseStatus}`);
    out.push(j.responseData.translatedText);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

export function provider() {
  if (process.env.TRANSLATE_PROVIDER === "off") return null;
  return process.env.DEEPL_API_KEY ? "deepl" : "mymemory";
}

export async function translateOne(text: string, from: Locale, to: Locale) {
  const p = provider();
  if (!p || !text.trim() || from === to) return null;
  const k = key(to, text);
  const have = await db.query.translations.findFirst({ where: eq(schema.translations.key, k) });
  if (have) return have.text;
  const out = p === "deepl" ? await deepl(text, from, to) : await mymemory(text, from, to);
  await db.insert(schema.translations).values({ key: k, source: from, target: to, text: out, provider: p }).onConflictDoNothing();
  return out;
}

/* Called every minute: translates open requests that are not cached yet, a few at a time so the
   free tiers are not exhausted in one go. Failures are retried on the next run. */
export async function fillTranslations(max = 12) {
  if (!provider()) return { done: 0 };
  const open = await db.select({ title: schema.requests.title, details: schema.requests.details, lang: schema.requests.lang }).from(schema.requests)
    .where(and(eq(schema.requests.status, "open"), gt(schema.requests.closesAt, new Date()))).limit(200);
  let done = 0;
  for (const r of open) {
    if (!isLocale(r.lang)) continue;
    for (const to of LOCALES) {
      if (to === r.lang) continue;
      for (const text of [r.title, r.details]) {
        if (!text || done >= max) continue;
        if (await db.query.translations.findFirst({ where: eq(schema.translations.key, key(to, text)), columns: { key: true } })) continue;
        try { await translateOne(text, r.lang, to); done++; } catch { return { done, error: true }; }
      }
    }
  }
  return { done };
}
