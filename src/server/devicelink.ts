import "server-only";
import { randomBytes } from "crypto";
import { and, eq, isNull, lt, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { RuleError } from "@/domain/rules";

const { deviceLinks: L } = schema;
const TTL = 10 * 60_000;
const B64 = /^[A-Za-z0-9+/=]{43,44}$/;
const fresh = () => gt(L.createdAt, new Date(Date.now() - TTL));

/* The new device asks: it sends only a one time public key. */
export async function start(userId: string, pub: string, device: string) {
  if (!B64.test(pub)) throw new RuleError("bad key");
  await db.delete(L).where(lt(L.createdAt, new Date(Date.now() - TTL)));
  await db.delete(L).where(and(eq(L.userId, userId), eq(L.pub, pub)));
  const id = randomBytes(12).toString("base64url");
  await db.insert(L).values({ id, userId, pub, device: device.slice(0, 40) });
  return id;
}
/* Devices that wait for approval, shown on the devices that already hold the key. */
export const pending = (userId: string) => db.select({ id: L.id, pub: L.pub, device: L.device }).from(L).where(and(eq(L.userId, userId), isNull(L.box), fresh()));
export async function approve(userId: string, id: string, box: string) {
  if (!/^[A-Za-z0-9+/=]{43,44}\.[A-Za-z0-9+/=]{30,40}\.[A-Za-z0-9+/=]{60,120}$/.test(box)) throw new RuleError("bad box");
  await db.update(L).set({ box }).where(and(eq(L.id, id), eq(L.userId, userId), isNull(L.box), fresh()));
}
export const refuse = (userId: string, id: string) => db.delete(L).where(and(eq(L.id, id), eq(L.userId, userId)));
/* The new device collects the sealed key once; the row is gone afterwards. */
export async function collect(userId: string, id: string) {
  const r = await db.query.deviceLinks.findFirst({ where: and(eq(L.id, id), eq(L.userId, userId), fresh()) });
  if (!r) return { gone: true as const };
  if (!r.box) return { wait: true as const };
  await db.delete(L).where(eq(L.id, id));
  return { box: r.box };
}
