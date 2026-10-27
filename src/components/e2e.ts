"use client";
import nacl from "tweetnacl";
import { decodeBase64, encodeBase64, decodeUTF8, encodeUTF8 } from "tweetnacl-util";

/* End to end encryption for deal chats with NaCl box (X25519 + XSalsa20 Poly1305).
   Each user has one key pair per device. The secret key stays in this browser; the server only
   ever receives the public key, nonces and ciphertext. Both parties derive the same shared key,
   so one ciphertext is readable by exactly the two of them. */
const KEY = (uid: string) => `brq_sk_${uid}`;

export function myKeys(uid: string) {
  try {
    const s = localStorage.getItem(KEY(uid));
    if (s) { const sk = decodeBase64(s); return nacl.box.keyPair.fromSecretKey(sk); }
  } catch {}
  const kp = nacl.box.keyPair();
  try { localStorage.setItem(KEY(uid), encodeBase64(kp.secretKey)); } catch {}
  return kp;
}
export const pub = (kp: nacl.BoxKeyPair) => encodeBase64(kp.publicKey);

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
