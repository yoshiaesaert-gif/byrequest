import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { openAlbum, viewerFor, shareItems } from "@/server/albums";
import { RuleError } from "@/domain/rules";
import { I } from "@/components/ui";
import Viewer from "./viewer";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function Album({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const u = await requireUser();
  const a = await openAlbum(await viewerFor(u.id, id), id).catch((e) => { if (e instanceof RuleError) return null; throw e; });
  if (!a) notFound();
  if (a.status !== "opened" || !a.mediaIds.length) {
    const wait = a.status === "requested";
    return (<div className="wrap"><div className="card empty" style={{ maxWidth: 480, margin: "40px auto" }}>
      <span className="empty-i"><I n={wait ? "clock" : "check"} c="lg" /></span><b className="t-h3">{wait ? t("Not shared yet") : a.status === "declined" ? t("Not shared") : t("This preview is gone")}</b>
      <p className="muted t-sm">{wait ? t("You get a notification when it can be opened.") : t("Each photo shows once, for 10 seconds. After that nothing is kept.")}</p><Link href="/deals" className="btn btn-secondary">{t("Back")}</Link></div></div>);
  }
  // The first photo that has not had its full turn yet: earlier ones are gone for good.
  const now = Date.now();
  const items = await shareItems(a.mediaIds);
  const start = a.mediaIds.findIndex((_, i) => { const v = a.views[String(i)]; return !v || now - new Date(v).getTime() < items[i].seconds * 1000; });
  // Coming back to an item whose turn already started: only the seconds that are left.
  const seen = start >= 0 ? a.views[String(start)] : null;
  const startMs = start >= 0 ? (seen ? Math.max(500, items[start].seconds * 1000 - (now - new Date(seen).getTime())) : items[start].seconds * 1000) : 0;
  return <Viewer id={id} items={items} start={start < 0 ? a.mediaIds.length : start} startMs={startMs} handle={u.handle} />;
}
