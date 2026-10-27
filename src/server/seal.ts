import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/* AES-256-GCM sealing for confidential fields. The key comes from CONFIDENTIAL_KEY and should live
   in a key management service in production. */
function key() {
  const k = process.env.CONFIDENTIAL_KEY;
  if (!k && process.env.NODE_ENV === "production") throw new Error("CONFIDENTIAL_KEY is required");
  return createHash("sha256").update(k || "dev-only-confidential-key").digest();
}

export function seal(value: unknown) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(value), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function unseal<T>(sealed: string): T {
  const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString("utf8")) as T;
}
