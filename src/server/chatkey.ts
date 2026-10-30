import "server-only";
import { createHash } from "crypto";
import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";

/* One chat key per account instead of per device: the secret key is kept sealed on the server and
   handed to every device the person signs in on, so phone and laptop read the same conversations. */
const wrap = (userId: string) => new Uint8Array(createHash("sha256").update(`user-chat:${process.env.SESSION_SECRET || "dev-secret"}:${userId}`).digest());
export function sealKey(userId: string, secretB64: string) {
  const n = nacl.randomBytes(nacl.secretbox.nonceLength);
  return `${encodeBase64(n)}.${encodeBase64(nacl.secretbox(decodeUTF8(secretB64), n, wrap(userId)))}`;
}
export function openKey(userId: string, box: string | null | undefined) {
  if (!box) return null;
  try { const [n, c] = box.split("."); const o = nacl.secretbox.open(decodeBase64(c), decodeBase64(n), wrap(userId)); return o ? encodeUTF8(o) : null; } catch { return null; }
}
export const publicFor = (secretB64: string) => encodeBase64(nacl.box.keyPair.fromSecretKey(decodeBase64(secretB64)).publicKey);
