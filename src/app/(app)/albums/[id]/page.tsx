import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { openAlbum, albumLive } from "@/server/albums";
import { RuleError, ALBUM_SECONDS } from "@/domain/rules";
import { I } from "@/components/ui";
import Viewer from "./viewer";

export default async function Album({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const a = await openAlbum(u.id, id).catch((e) => { if (e instanceof RuleError) return null; throw e; });
  if (!a) notFound();
  if (!albumLive(a)) return (<div className="wrap"><div className="card empty" style={{ maxWidth: 480, margin: "40px auto" }}>
    <span className="empty-i"><I n="check" c="lg" /></span><b className="t-h3">{a.status === "in_review" || a.status === "requested" ? "Not ready yet" : "This album is gone"}</b>
    <p className="muted t-sm">{a.status === "in_review" || a.status === "requested" ? "You get a notification when it can be opened." : "Preview albums open once, for 60 seconds, and are then deleted on both sides."}</p><Link href="/deals" className="btn btn-secondary">Back to your deals</Link></div></div>);
  const left = Math.max(0, Math.round((a.openedAt!.getTime() + ALBUM_SECONDS * 1000 - Date.now()) / 1000));
  return <Viewer id={id} count={a.mediaIds.length} seconds={left} handle={u.handle} />;
}
