import { cookies } from "next/headers";
import { requireUser } from "@/server/auth";
import { feed, savedIds } from "@/server/queries";
import Feed from "./feed";

export default async function ForYou({ searchParams }: { searchParams: Promise<{ tab?: string; c?: string; q?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const tab = sp.tab === "new" ? "new" : sp.tab === "ending" ? "ending" : "for-you";
  const sell = u.isCreator && (await cookies()).get("brq_mode")?.value === "sell";
  let items = await feed({ viewerId: u.id, tab, category: sp.c, limit: 40 });
  if (sp.q) { const t = sp.q.toLowerCase(); items = items.filter((r) => r.title.toLowerCase().includes(t)); }
  const saved = await savedIds(u.id);
  return <Feed items={items.filter((r) => !r.mine).map((r) => ({ ...r, saved: saved.has(r.id) }))} tab={tab} sell={sell} frost={u.prefs.frost} />;
}
