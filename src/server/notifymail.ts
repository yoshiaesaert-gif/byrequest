import "server-only";
import { and, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema as S } from "@/db";
import { deliver, SITE, unsubToken, type Mail } from "./mailkit";

/* An email when something waits in the app: a message, a question, a choice, a delivery.
   At most one email per half hour, only when the person has not been on the site since, and never
   with what it is about: the subject and text are neutral, the details stay behind the sign in. */
type Lang = "nl" | "en" | "fr";
const GAP_MS = 30 * 60_000, SETTLE_MS = 2 * 60_000, WINDOW_MS = 24 * 3600_000;
const T: Record<Lang, { subject: (n: number) => string; pre: string; kicker: string; title: (n: number) => string; intro: string; cta: string; why: string; unsub: string; rights: string }> = {
  nl: { subject: (n) => (n === 1 ? "Er wacht iets op je" : `Er wachten ${n} updates op je`), pre: "Log in om het te bekijken.", kicker: "Nieuw voor jou", title: (n) => (n === 1 ? "Je hebt een nieuwe update" : `Je hebt ${n} nieuwe updates`), intro: "Er gebeurde iets op je account, bijvoorbeeld een bericht of een vraag. Voor je privacy staat hier niet wat het is: je ziet het meteen na het inloggen.", cta: "Bekijk het", why: "Je krijgt deze e-mail omdat er iets op je account gebeurde. Geen tips en herinneringen meer?", unsub: "Uitschrijven", rights: "Alle rechten voorbehouden" },
  en: { subject: (n) => (n === 1 ? "Something is waiting for you" : `${n} updates are waiting for you`), pre: "Sign in to see it.", kicker: "New for you", title: (n) => (n === 1 ? "You have a new update" : `You have ${n} new updates`), intro: "Something happened on your account, for example a message or a question. For your privacy this email does not say what: you see it right after signing in.", cta: "See it", why: "You get this email because something happened on your account. No more tips and reminders?", unsub: "Unsubscribe", rights: "All rights reserved" },
  fr: { subject: (n) => (n === 1 ? "Quelque chose t'attend" : `${n} nouveautés t'attendent`), pre: "Connecte toi pour voir.", kicker: "Nouveau pour toi", title: (n) => (n === 1 ? "Tu as une nouveauté" : `Tu as ${n} nouveautés`), intro: "Il s'est passé quelque chose sur ton compte, par exemple un message ou une question. Pour ta vie privée, cet e-mail ne dit pas quoi : tu le vois dès la connexion.", cta: "Voir", why: "Tu reçois cet e-mail car il s'est passé quelque chose sur ton compte. Plus de conseils ni de rappels ?", unsub: "Se désinscrire", rights: "Tous droits réservés" },
};

export async function mailNotifications(now = new Date()) {
  const due = await db.select({ id: S.notifications.id, userId: S.notifications.userId, href: S.notifications.href, at: S.notifications.createdAt }).from(S.notifications)
    .where(and(isNull(S.notifications.mailedAt), isNull(S.notifications.readAt), lt(S.notifications.createdAt, new Date(now.getTime() - SETTLE_MS)), gt(S.notifications.createdAt, new Date(now.getTime() - WINDOW_MS))));
  if (!due.length) return 0;
  const byUser = new Map<string, typeof due>();
  for (const n of due) byUser.set(n.userId, [...(byUser.get(n.userId) ?? []), n]);
  const people = await db.select().from(S.users).where(inArray(S.users.id, [...byUser.keys()]));
  let sent = 0;
  for (const u of people) {
    const list = byUser.get(u.id)!;
    const skip = u.house || !!u.deletedAt || !!u.bannedAt || u.email.endsWith("@demo.byrequest.app") || u.email.endsWith("@invalid.byrequest");
    const newest = Math.max(...list.map((n) => n.at.getTime()));
    const seenSince = u.lastSeenAt && u.lastSeenAt.getTime() > newest;          // they already came back: nothing to tell
    const tooSoon = u.notifyMailedAt && now.getTime() - u.notifyMailedAt.getTime() < GAP_MS;
    if (tooSoon && !skip && !seenSince) continue;                                 // try again later, bundled
    const ids = list.map((n) => n.id);
    if (!skip && !seenSince) {
      const l = (["nl", "en", "fr"].includes(u.lang) ? u.lang : "nl") as Lang; const c = T[l];
      const href = list.length === 1 && list[0].href.startsWith("/") ? `${SITE}${list[0].href}` : `${SITE}/inbox`;
      const m: Mail = { lang: l, theme: "violet", preheader: c.pre, kicker: c.kicker, title: c.title(list.length), intro: c.intro, cta: { label: c.cta, href }, footer: { why: c.why, unsub: c.unsub, rights: c.rights, unsubUrl: `${SITE}/u/${unsubToken(u.id)}` } };
      try { await deliver(u.email, c.subject(list.length), m); sent++; } catch (e) { console.error("notify mail", e instanceof Error ? e.message : e); continue; }
      await db.update(S.users).set({ notifyMailedAt: now }).where(eq(S.users.id, u.id));
    }
    await db.update(S.notifications).set({ mailedAt: now }).where(inArray(S.notifications.id, ids));
  }
  return sent;
}
