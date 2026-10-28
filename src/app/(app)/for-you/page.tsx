import { themeOf } from "@/content/themes";
import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import { feed, savedIds } from "@/server/queries";
import Feed from "./feed";
import { getLocale } from "@/i18n/server";
import { localize } from "@/server/translate";

export default async function ForYou({ searchParams }: { searchParams: Promise<{ tab?: string; c?: string; q?: string; theme?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const tab = sp.tab === "new" ? "new" : sp.tab === "ending" ? "ending" : "for-you";
  const sell = u.isCreator && (await cookies()).get("brq_mode")?.value === "sell";
  let items = await feed({ viewerId: u.id, tab, category: sp.c, limit: 40 });
  const th = themeOf(sp.theme);
  if (th) items = items.filter((r) => th.match.test(`${r.title} ${r.details ?? ""}`));
  if (sp.q) { const t = sp.q.toLowerCase(); items = items.filter((r) => r.title.toLowerCase().includes(t)); }
  const saved = await savedIds(u.id);
  const shown = await localize(items, await getLocale());
  return <Feed items={shown.filter((r) => !r.mine).map((r) => ({ ...r, saved: saved.has(r.id) }))} tab={tab} sell={sell} frost={u.prefs.frost} />;
}
