import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, schema as S } from "@/db";
import { getT } from "@/i18n/server";
import { Av, Stars } from "@/components/ui";
import PubShell from "@/components/pub-shell";
import { share } from "@/config/share";

/* /c/{handle} for visitors who are not signed in and for link previews: a share-safe card a creator can put in
   their bio. Only verified creators with a public profile; nothing they wrote themselves (bio, likes) is shown here,
   and a photo avatar is replaced by their initial, so the page is always safe to share. Everyone else gets a 404. */
async function creator(handleRaw: string) {
  const handle = decodeURIComponent(handleRaw).slice(0, 40);
  const u = await db.query.users.findFirst({ where: and(eq(S.users.handle, handle), isNull(S.users.deletedAt), isNull(S.users.bannedAt)) });
  if (!u || !u.isCreator || u.house) return null;
  const [onb, prof, deals] = await Promise.all([
    db.query.onboarding.findFirst({ where: eq(S.onboarding.userId, u.id), columns: { identity: true, restriction: true } }),
    db.query.creatorProfiles.findFirst({ where: eq(S.creatorProfiles.userId, u.id), columns: { visibility: true } }),
    db.select({ n: count() }).from(S.deals).where(and(eq(S.deals.creatorId, u.id), eq(S.deals.status, "released"))),
  ]);
  if (onb?.identity !== "approved" || onb.restriction === "suspended" || prof?.visibility !== "public") return null;
  return { handle: u.handle, avatar: u.avatar?.kind === "photo" ? null : u.avatar, sum: u.ratingSum, ratings: u.ratingCount, deals: deals[0].n };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const c = await creator((await params).handle);
  if (!c) return { title: "Not found", robots: { index: false, follow: false } };
  return share({ title: `${c.handle} on ByRequest`, description: `${c.handle} is a verified creator on ByRequest. Request something made just for you, with secure checkout and private delivery.`, path: `/c/${encodeURIComponent(c.handle)}`, index: true });
}

export default async function PublicCreator({ params }: { params: Promise<{ handle: string }> }) {
  const c = await creator((await params).handle);
  if (!c) notFound();
  const { t } = await getT();
  return (<PubShell><div className="wrap pc">
    <section className="card pc-card">
      <Av a={c.avatar} name={c.handle} size={112} square />
      <h1 className="t-h1">{c.handle}</h1>
      <p className="pc-badge">✓ {t("Verified creator")}</p>
      <div className="pc-stats">{c.ratings ? <span><Stars sum={c.sum} count={c.ratings} t={t} /></span> : null}{c.deals ? <span>{t("{n} completed requests", { n: c.deals })}</span> : <span>{t("New on ByRequest")}</span>}</div>
      <p className="muted pc-txt">{t("Request something made just for you. You agree on the budget first, your payment is held until delivery, and it arrives privately in your vault.")}</p>
      <Link href={`/signin?as=buy&next=${encodeURIComponent(`/c/${c.handle}`)}`} className="btn btn-primary btn-lg btn-block">{t("Request something from {name}", { name: c.handle })}</Link>
      <Link href="/how-it-works" className="pc-how">{t("How it works")}</Link>
    </section>
  </div></PubShell>);
}
