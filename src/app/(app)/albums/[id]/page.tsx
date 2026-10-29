import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { openAlbum, PHOTO_SECONDS } from "@/server/albums";
import { RuleError } from "@/domain/rules";
import { I } from "@/components/ui";
import Viewer from "./viewer";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function Album({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const u = await requireUser();
  const a = await openAlbum(u.id, id).catch((e) => { if (e instanceof RuleError) return null; throw e; });
  if (!a) notFound();
  if (a.status !== "opened" || !a.mediaIds.length) {
    const wait = a.status === "requested";
    return (<div className="wrap"><div className="card empty" style={{ maxWidth: 480, margin: "40px auto" }}>
      <span className="empty-i"><I n={wait ? "clock" : "check"} c="lg" /></span><b className="t-h3">{wait ? t("Not shared yet") : a.status === "declined" ? t("Not shared") : t("This preview is gone")}</b>
      <p className="muted t-sm">{wait ? t("You get a notification when it can be opened.") : t("Each photo shows once, for 10 seconds. After that nothing is kept.")}</p><Link href="/deals" className="btn btn-secondary">{t("Back")}</Link></div></div>);
  }
  // The first photo that has not had its full turn yet: earlier ones are gone for good.
  const now = Date.now();
  const start = a.mediaIds.findIndex((_, i) => { const v = a.views[String(i)]; return !v || now - new Date(v).getTime() < PHOTO_SECONDS * 1000; });
  return <Viewer id={id} count={a.mediaIds.length} start={start < 0 ? a.mediaIds.length : start} seconds={PHOTO_SECONDS} handle={u.handle} />;
}
