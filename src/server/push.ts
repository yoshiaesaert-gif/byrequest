import "server-only";
import webpush from "web-push";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as S } from "@/db";
import { DICTS } from "@/i18n/dicts";
import { isLocale, translator } from "@/i18n/config";

/* Web Push: a real notification on the phone (home screen app) or computer for every new notice in the app.
   Discreet by default, like the setting says: the lock screen only reads "You have a new message". */
const ready = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
let configured = false;
function setup() {
  if (configured || !ready()) return ready();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://byrequest.me", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true; return true;
}
export const pushKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

export async function subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, device: string, app: boolean) {
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("bad subscription");
  await db.insert(S.pushSubscriptions).values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, device: device.slice(0, 120), app })
    .onConflictDoUpdate({ target: S.pushSubscriptions.endpoint, set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, device: device.slice(0, 120), app } });
}
export async function unsubscribe(userId: string, endpoint: string) {
  await db.delete(S.pushSubscriptions).where(and(eq(S.pushSubscriptions.userId, userId), eq(S.pushSubscriptions.endpoint, endpoint)));
}

/* Called every few seconds: claims unread notices that were not pushed yet (so two runs never send twice),
   bundles them per person and sends one notification to each of their devices. Dead devices are removed. */
export async function dispatchPush() {
  if (!setup()) return 0;
  const rows = (await db.execute<{ id: string; user_id: string; title: string; body: string; href: string }>(sql`
    update notifications set pushed_at = now() where id in (
      select n.id from notifications n where n.pushed_at is null and n.read_at is null
        and n.created_at > now() - interval '30 minutes' and n.created_at < now() - interval '3 seconds'
        and exists (select 1 from push_subscriptions p where p.user_id = n.user_id)
      for update skip locked limit 200)
    returning id, user_id, title, body, href`)).rows;
  if (!rows.length) return 0;
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  const people = await db.select({ id: S.users.id, lang: S.users.lang, prefs: S.users.prefs }).from(S.users).where(inArray(S.users.id, [...byUser.keys()]));
  const subs = await db.select().from(S.pushSubscriptions).where(inArray(S.pushSubscriptions.userId, [...byUser.keys()]));
  let sent = 0;
  for (const p of people) {
    const list = byUser.get(p.id)!; const last = list[list.length - 1];
    const t = translator(DICTS[isLocale(p.lang) ? p.lang : "en"]);
    const discreet = p.prefs?.discreetPush !== false;
    const payload = JSON.stringify({
      title: discreet ? "ByRequest" : t(last.title),
      body: discreet ? (list.length > 1 ? t("You have {n} new messages", { n: list.length }) : t("You have a new message")) : t(last.body).slice(0, 140),
      href: list.length > 1 ? "/inbox" : last.href, tag: "brq", n: list.length,
    });
    for (const s of subs.filter((x) => x.userId === p.id)) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" });
        sent++; await db.update(S.pushSubscriptions).set({ lastSentAt: new Date() }).where(eq(S.pushSubscriptions.id, s.id));
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.delete(S.pushSubscriptions).where(eq(S.pushSubscriptions.id, s.id));
        else console.error("push", code ?? (e instanceof Error ? e.message : e));
      }
    }
  }
  return sent;
}
