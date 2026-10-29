import { getT } from "@/i18n/server";
import Link from "next/link";
import { requireCreator } from "@/server/auth";
import { albumsForCreator, creatorEarnings } from "@/server/queries";
import { access } from "@/server/onboarding";
import { listFor } from "@/server/participants";
import { Empty, I } from "@/components/ui";
import { euros } from "@/domain/rules";
import { AlbumAnswer, AddParticipant, AlbumManager } from "./parts";
import { myPhotos, ALBUM_MAX } from "@/server/albums";

export default async function Studio() {
  const { t } = await getT();
  const u = await requireCreator();
  const [a, albums, parts, earn, photos] = await Promise.all([access(u.id), albumsForCreator(u.id), listFor(u.id), creatorEarnings(u.id), myPhotos(u.id)]);
  return (<div className="wrap">
    <div className="page-h"><div><h1 className="t-h1">{t("Studio")}</h1><p className="muted" style={{ marginTop: 6 }}>{t("Earnings, preview requests and the people who appear in your content.")}</p></div><Link href="/onboarding" className="btn btn-secondary">{t("Creator setup")}</Link></div>
    <div className="pulse pulse-3">
      <div className="card"><span>{t("This month")}</span><b className="num">{euros(earn.monthCents)}</b><span>{t("paid out")}</span></div>
      <div className="card"><span>{t("In progress")}</span><b className="num">{euros(earn.pendingCents)}</b><span>{t("released after review and 24 hours")}</span></div>
      <div className="card"><span>{t("Payouts")}</span><b>{t(a.caps.receivePayouts ? "Enabled" : "Not enabled")}</b><span>{a.caps.receivePayouts ? t("right after each delivery, through the payment partner") : earn.heldCents ? t("{amount} waiting for payout setup", { amount: euros(earn.heldCents) }) : t("finish payout setup")}</span></div>
    </div>

    <section className="sec" id="album"><div className="sec-h"><h2 className="t-h2">{t("Your preview album")}</h2></div>
      <div className="card group alb-card"><p className="t-sm muted">{t("A few photos of you that only you control: looks, body, and if you like intimate. Hidden from everyone. When a buyer who is choosing asks to see more, you decide whether to share. They see each photo once, for 10 seconds, with their name on it.")}</p>
        <AlbumManager photos={photos} max={ALBUM_MAX} canUpload={a.caps.upload} /></div>
    </section>

    <section className="sec" id="previews"><div className="sec-h"><h2 className="t-h2">{t("Preview requests")}</h2></div>
      {albums.length ? <div className="card" style={{ padding: "4px 16px" }}><div className="list">{albums.map((x) => <AlbumAnswer key={x.a.id} id={x.a.id} title={x.title} photos={photos} canShare={a.caps.upload} />)}</div></div>
        : <Empty icon="eye" title={t("No preview requests")} text={t("Buyers who are choosing between offers can ask to see more. You always decide.")} />}
    </section>

    <section className="sec" id="participants"><div className="sec-h"><h2 className="t-h2">{t("People in your content")}</h2></div>
      <div className="card group">
        <p className="t-sm muted" style={{ paddingTop: 8 }}>{t("Anyone else who is visible or audible must verify as an adult and consent to each delivery before it is shared. Add them here and send them their private link. They do not need an account.")}</p>
        {parts.map((p) => <div key={p.id} className="setrow"><div><b>{p.label}</b><span className="s">{t("Added")} {p.createdAt.toISOString().slice(0, 10)}</span></div><span className={`status st-${p.identity}`}>{t(p.identity === "approved" ? "Verified" : p.identity === "pending" ? "Being reviewed" : p.identity === "not_started" ? "Not verified yet" : "Needs action")}</span></div>)}
        <AddParticipant />
      </div>
    </section>
  </div>);
}
