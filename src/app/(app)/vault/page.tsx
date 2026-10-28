import { getT } from "@/i18n/server";
import { textsIn } from "@/server/translate";
import { redirect } from "next/navigation";
import { BUYER_AGE_CHECK } from "@/config/compliance";
import { isAgeVerified } from "@/server/onboarding";
import Link from "next/link";
import { requireUser } from "@/server/auth";
import { vault } from "@/server/queries";
import { Empty, I } from "@/components/ui";

export default async function Vault({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { t, locale } = await getT();
  const u = await requireUser();
  if (BUYER_AGE_CHECK && !(await isAgeVerified(u.id))) redirect(`/verify-age?next=${encodeURIComponent("/vault")}`);
  const f = (await searchParams).f ?? "All";
  const rows = await vault(u.id);
  const L = await textsIn(rows.map((x) => x.r.title), locale);
  const match = { All: null, Videos: "video/", Photos: "image/", Audio: "audio/" }[f as "All"] ?? null;
  const list = rows.filter((x) => !match || x.m.mime.startsWith(match));
  const left = (d: Date | null) => { if (!d) return "Forever"; const days = Math.ceil((d.getTime() - Date.now()) / 86400_000); return days <= 1 ? "Last day" : `${days} days left`; };
  return (<div className="wrap">
    <div className="page-h"><div><h1 className="t-h1">{t("Vault")}</h1><p className="muted" style={{ marginTop: 6 }}>{t("Only you can open these. Nothing can be downloaded or forwarded.")}</p></div></div>
    <div className="vault-banner"><I n="lock" c="lg" /><div><b>{t("Every view carries your name, visible and hidden")}</b><div className="t-sm muted">{t("It lowers the risk of leaks and helps trace them back to an account. No technology can fully prevent copying, so it protects creators and keeps leaking pointless.")}</div></div></div>
    <div className="sortbar">{["All", "Videos", "Photos", "Audio"].map((x) => <Link key={x} href={x === "All" ? "/vault" : `/vault?f=${x}`} className={"chip" + (f === x ? " is-on" : "")}>{t(x)}</Link>)}</div>
    {list.length ? <div className="vault-grid">{list.map(({ v, m, r, creator }) => (
      <Link key={v.id} href={`/vault/${v.id}`} className="vi"><div className="media">
        {r.cover?.startsWith("g-") ? <span className={"neutralbg " + r.cover} /> : <img className="cimg" src={`/img/${r.cover ?? "c18"}.webp`} alt="" />}<span className="cscrim" />
        <div className="top"><span className="badge glass">{m.mime.startsWith("image/") ? t("Photo") : m.durationSec ? `${Math.floor(m.durationSec / 60)}:${String(m.durationSec % 60).padStart(2, "0")}` : t("Audio")}</span><span className="badge glass"><I n="clock" c="sm" />{left(v.availableUntil)}</span></div>
        <div className="play"><span><I n={m.mime.startsWith("image/") ? "eye" : "play"} /></span></div></div>
        <div><b>{L(r.title)}</b><div className="t-sm muted">{t("from")} {creator}</div></div></Link>))}</div>
      : <Empty icon="vault" title={t("Your vault is empty")} text={t("Deliveries land here after review. They stay for the period the creator set.")} action={<Link href="/post" className="btn btn-primary">{t("Post a request")}</Link>} />}
  </div>);
}
