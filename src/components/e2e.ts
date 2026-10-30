"use client";
import nacl from "tweetnacl";
import { decodeBase64, encodeBase64, decodeUTF8, encodeUTF8 } from "tweetnacl-util";

/* End to end encryption for chats with NaCl box (X25519 + XSalsa20 Poly1305).
   Each account has one key pair. The secret key lives only in the browsers of its owner: a new
   device gets it from a device that already has it (sealed to a one time key, confirmed with a
   code on both screens) or unlocks it with the owner's passkey (PRF). The server only ever holds
   the public key, nonces, ciphertext and locked boxes it cannot open. */
const KEY = (uid: string) => `brq_sk_${uid}`;

/* The key of this device, or null when this device has none yet. Never invents one. */
export function myKeys(uid: string): nacl.BoxKeyPair | null {
  try { const s = localStorage.getItem(KEY(uid)); if (s) return nacl.box.keyPair.fromSecretKey(decodeBase64(s)); } catch {}
  return null;
}
export function keepKey(uid: string, sk: Uint8Array) { try { localStorage.setItem(KEY(uid), encodeBase64(sk)); } catch {} }
export const pub = (kp: nacl.BoxKeyPair) => encodeBase64(kp.publicKey);
export const newKeys = () => nacl.box.keyPair();

export function seal(text: string, theirPublic: string, kp: nacl.BoxKeyPair) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const box = nacl.box(decodeUTF8(text), nonce, decodeBase64(theirPublic), kp.secretKey);
  return { nonce: encodeBase64(nonce), body: encodeBase64(box) };
}

export function open(body: string, nonce: string, theirPublic: string, kp: nacl.BoxKeyPair) {
  try {
    const out = nacl.box.open(decodeBase64(body), decodeBase64(nonce), decodeBase64(theirPublic), kp.secretKey);
    return out ? encodeUTF8(out) : null;
  } catch { return null; }
}

/* Passkey lock: the PRF secret never leaves the browser; only the locked box goes to the server. */
export const PRF_SALT = nacl.hash(decodeUTF8("byrequest chat key v1")).slice(0, 32);
const wrapKey = (prf: ArrayBuffer) => nacl.hash(new Uint8Array(prf)).slice(0, 32);
export function lockKey(prf: ArrayBuffer, sk: Uint8Array) {
  const n = nacl.randomBytes(nacl.secretbox.nonceLength);
  return `${encodeBase64(n)}.${encodeBase64(nacl.secretbox(sk, n, wrapKey(prf)))}`;
}
export function unlockKey(prf: ArrayBuffer, box: string) {
  try { const [n, c] = box.split("."); return nacl.secretbox.open(decodeBase64(c), decodeBase64(n), wrapKey(prf)); } catch { return null; }
}

/* Device linking: the old device seals the key to the new device's one time key. */
export function sealTo(theirPub: string, sk: Uint8Array) {
  const e = nacl.box.keyPair(); const n = nacl.randomBytes(nacl.box.nonceLength);
  return `${encodeBase64(e.publicKey)}.${encodeBase64(n)}.${encodeBase64(nacl.box(sk, n, decodeBase64(theirPub), e.secretKey))}`;
}
export function openFrom(box: string, mine: nacl.BoxKeyPair) {
  try { const [p, n, c] = box.split("."); return nacl.box.open(decodeBase64(c), decodeBase64(n), decodeBase64(p), mine.secretKey); } catch { return null; }
}
/* Six digits both screens show; a different key on the way gives different digits. */
export function linkCode(pubB64: string) {
  const h = nacl.hash(decodeBase64(pubB64));
  const n = ((h[0] << 16) | (h[1] << 8) | h[2]) % 1_000_000;
  return String(n).padStart(6, "0").replace(/(\d{3})(\d{3})/, "$1 $2");
}
