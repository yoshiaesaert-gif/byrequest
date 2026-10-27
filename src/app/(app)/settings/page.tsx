import { getT } from "@/i18n/server";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { access } from "@/server/onboarding";
import { Av, I } from "@/components/ui";
import { Toggle, BecomeCreator, ProfileForm, Marketing, DeleteAccount } from "./parts";

export default async function Settings() {
  const { t } = await getT();
  const u = await requireUser();
  const [a, prof] = await Promise.all([u.isCreator ? access(u.id) : null, db.query.creatorProfiles.findFirst({ where: eq(schema.creatorProfiles.userId, u.id) })]);
  return (<div className="wrap">
    <div className="page-h"><div><h1 className="t-h1">{t("Profile and privacy")}</h1><p className="muted" style={{ marginTop: 6 }}>{t("Only your username and avatar are ever shown to others.")}</p></div></div>
    <div className="settings">
      <div className="card idcard"><Av a={u.avatar} name={u.handle} size={88} /><b className="t-h2">{u.handle}</b><Link href="/avatar" className="btn btn-secondary btn-sm"><I n="spark" c="sm" />{t("Edit avatar")}</Link>
        {a ? <span className={"badge " + (a.status === "active" ? "ok" : "amber")}>{a.status === "active" ? "Verified creator" : "Creator setup not finished"}</span> : null}
        <div className="stats"><div><b className="num">{u.ratingCount ? (u.ratingSum / u.ratingCount).toFixed(1) : "–"}</b><span>{t("Rating")}</span></div><div><b className="num">{u.ratingCount}</b><span>{t("Ratings")}</span></div><div><b className="num">{new Date().getFullYear() - u.birthYear}</b><span>{t("Age")}</span></div></div></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div className="card group"><h3 className="t-h3">{t("Privacy")}</h3>
          <div className="setrow"><div><b>{t("End to end encrypted chats")}</b><span className="s">{t("Always on. Not even ByRequest can read your messages")}</span></div><span className="badge ok"><I n="lock" c="sm" />{t("On")}</span></div>
          <Toggle k="frost" on={u.prefs.frost} b="Frosted covers" s="Covers stay behind glass until you hover or hold" />
          <Toggle k="discreetPush" on={u.prefs.discreetPush} b="Discreet notifications" s="Alerts only say: You have a new message" />
          <Toggle k="neutralTab" on={u.prefs.neutralTab} b="Neutral tab name" s="Your browser tab shows Notes" />
          <div className="setrow"><div><b>{t("Bank statement")}</b><span className="s">{t("Payments show as BRQ DIGITAL")}</span></div><span className="badge">{t("Always")}</span></div>
          <div className="setrow"><div><b>{t("Quick hide")}</b><span className="s">{t("Press Esc twice, or tap the eye icon on mobile")}</span></div><span className="badge">{t("Always")}</span></div>
        </div>
        <div className="card group"><h3 className="t-h3">{t("Messages from ByRequest")}</h3><Marketing on={u.marketingOptIn} /></div>
        <div className="card group" id="privacy"><h3 className="t-h3">{t("Your data")}</h3>
          <div className="setrow"><div><b>{t("Download your data")}</b><span className="s">{t("Everything we hold about you, in one file")}</span></div><a href="/api/me/export" className="btn btn-secondary btn-sm">{t("Download")}</a></div>
          <div className="setrow"><div><b>{t("Privacy statement")}</b><span className="s">{t("What we keep, why, and for how long")}</span></div><Link href="/legal/privacy" className="btn btn-secondary btn-sm">{t("Read")}</Link></div>
          <DeleteAccount />
        </div>
        <div className="card group" id="creator"><h3 className="t-h3">{t("Creating")}</h3>
          {!u.isCreator ? <BecomeCreator /> : (<>
            <div className="setrow"><div><b>{t("Creator setup")}</b><span className="s">{a!.status === "active" ? "Identity, agreement and payouts approved" : a!.missing.join(" · ")}</span></div><Link href="/onboarding" className="btn btn-secondary btn-sm">{a!.status === "active" ? "View" : "Continue"}</Link></div>
            <div id="profile" /><ProfileForm p={prof ? { visibility: prof.visibility, bio: prof.bio, heightCm: prof.heightCm, build: prof.build ?? "", sport: prof.sport ?? "", work: prof.work ?? "", languages: prof.languages ?? "", hair: prof.hair ?? "", eyes: prof.eyes ?? "", body: prof.body ?? "", tattoos: prof.tattoos ?? "", makes: prof.makes.join(", "), never: prof.never.join(", "), showsFace: prof.showsFace, defaultVault: prof.defaultVault } : null} handle={u.handle} />
          </>)}
        </div>
      </div>
    </div>
  </div>);
}
