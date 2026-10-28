/* Test conversations for a staff account, so the inbox and the chat can be tried end to end.
   Chats are end to end encrypted, so this needs the account's public key: it exists once the
   person has opened ByRequest on a device. The demo counterpart gets a fresh key pair here; its
   secret is used once to encrypt the sample lines and then thrown away. */
import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64 } from "tweetnacl-util";
import { eq } from "drizzle-orm";
import { db, schema as S } from "@/db";
import { addHours, split } from "@/domain/rules";

type Line = [from: "me" | "them", minutesAgo: number, text: string];
const H = (h: number) => new Date(Date.now() + h * 3600_000);

const CHATS: { role: "buyer" | "creator"; other: string; title: string; cat: "video" | "photos" | "voice"; amount: number; euro: number; cover: string; status: "held" | "delivered"; lines: Line[] }[] = [
  { role: "buyer", other: "milo", title: "Shower video, calm and natural", cat: "video", amount: 10, euro: 80, cover: "c05", status: "held", lines: [
    ["them", 1600, "Hey! Thanks for choosing me 😊"], ["them", 1599, "Quick question: warm light or more of a morning vibe?"],
    ["me", 1580, "Warm light please, evening mood 🌙"], ["them", 1578, "Perfect, I have the right lamp for that 👌"],
    ["me", 70, "How is it going?"], ["them", 42, "Filmed it this afternoon, editing now ✨"], ["them", 41, "You will have it tonight"], ["me", 12, "🔥🔥"] ] },
  { role: "creator", other: "nightowl", title: "Good night voice note", cat: "voice", amount: 3, euro: 25, cover: "c17", status: "held", lines: [
    ["them", 300, "Hi! Can you mention my username at the start?"], ["me", 290, "Of course 🙂 Calm and slow, like the request says?"],
    ["them", 288, "Yes exactly. Take your time."], ["them", 5, "Looking forward to it 🙏"] ] },
  { role: "buyer", other: "lina.m", title: "Post workout photo set", cat: "photos", amount: 8, euro: 45, cover: "c07", status: "delivered", lines: [
    ["them", 3000, "Delivered! Let me know what you think 📸"], ["me", 2990, "Wow, really nice. Thank you!"] ] },
];

export async function fillTestInbox(userId: string) {
  const me = await db.query.users.findFirst({ where: eq(S.users.id, userId) });
  if (!me?.publicKey) return { ok: false as const, error: "Open ByRequest once on this device first, then try again." };
  let made = 0;
  for (const c of CHATS) {
    const other = await db.query.users.findFirst({ where: eq(S.users.handle, c.other) });
    if (!other) continue;
    const kp = nacl.box.keyPair();
    await db.update(S.users).set({ publicKey: encodeBase64(kp.publicKey) }).where(eq(S.users.id, other.id));
    const buyerId = c.role === "buyer" ? me.id : other.id, creatorId = c.role === "buyer" ? other.id : me.id;
    const created = H(-30);
    const [r] = await db.insert(S.requests).values({ buyerId, title: c.title, category: c.cat, amount: c.amount, dealCents: c.euro * 100, who: "Anyone", ageMin: 18, ageMax: 40, face: "not_needed", minVault: "30d", dueHours: 72, closesAt: H(-20), cover: c.cover, status: "matched", createdAt: created }).returning();
    const [o] = await db.insert(S.offers).values({ requestId: r.id, creatorId, showsFace: false, vault: "30d", etaHours: 72, note: "", status: "accepted" }).returning();
    const m = split(r.dealCents);
    const delivered = c.status === "delivered" ? H(-2) : null;
    const [d] = await db.insert(S.deals).values({ requestId: r.id, offerId: o.id, buyerId, creatorId, dealCents: m.dealCents, feeCents: m.feeCents, creatorCents: m.creatorCents, paymentRef: "test", status: c.status, dueAt: addHours(created, 72), deliveredAt: delivered, objectUntil: delivered ? addHours(delivered, 24) : null, createdAt: created,
      ...(c.role === "buyer" ? { creatorReadAt: H(-0.15) } : { buyerReadAt: H(-1) }) }).returning();
    await db.insert(S.messages).values({ dealId: d.id, kind: "system", body: "Offer accepted. The money is held by the payment partner until delivery.", createdAt: created });
    for (const [from, ago, text] of c.lines) {
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      // nacl.box gives the same shared key both ways, so a line "from me" is sealed with my public key and the other's secret.
      const body = nacl.box(decodeUTF8(text), nonce, decodeBase64(me.publicKey), kp.secretKey);
      await db.insert(S.messages).values({ dealId: d.id, senderId: from === "me" ? me.id : other.id, kind: "e2e", nonce: encodeBase64(nonce), body: encodeBase64(body), createdAt: new Date(Date.now() - ago * 60_000) });
    }
    if (delivered) await db.insert(S.messages).values({ dealId: d.id, kind: "system", body: "Delivered. The automatic check passed and it is in the buyer's vault.", createdAt: delivered });
    made++;
  }
  const notes: [string, string, string, number][] = [
    ["New message", "You have a new message.", "/inbox", 0.2],
    ["Delivered", "Your content is ready in your vault.", "/vault", 2],
    ["New candidate", "A creator applied for your request.", "/deals", 5],
    ["Payment released", "€64 is on its way to your payout account.", "/studio", 26],
    ["Request approved", "Your request is live on the board.", "/deals", 30],
    ["Welcome to ByRequest", "Your account is ready. Have a look around.", "/", 50],
  ];
  await db.insert(S.notifications).values(notes.map(([title, body, href, h], i) => ({ userId: me.id, title, body, href, createdAt: H(-h), readAt: i > 2 ? H(-h + 0.5) : null })));
  return { ok: true as const, made };
}
