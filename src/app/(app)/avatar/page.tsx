import { requireUser } from "@/server/auth";
import Studio from "./studio";
import { getT } from "@/i18n/server";

export default async function AvatarPage() {
  const u = await requireUser();
  const { t } = await getT();
  return (<div className="wrap" style={{ maxWidth: 760 }}>
    <div className="page-h"><div><h1 className="t-h1">{t("Your avatar")}</h1><p className="muted" style={{ marginTop: 6 }}>{t("Nobody needs to see your real face. Pick a 3D look, fine tune it, or use a blurred photo.")}</p></div></div>
    <Studio current={u.avatar?.kind === "3d" ? u.avatar.look : null} />
  </div>);
}
