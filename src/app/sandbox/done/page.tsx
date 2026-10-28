import { getT } from "@/i18n/server";

export default async function SandboxDone() {
  const { t } = await getT();
  return <div className="sbx"><div className="card"><h1 className="t-h2">{t("Done")}</h1><p className="t-sm muted">{t("Your result was sent to ByRequest. You can close this page and go back.")}</p></div></div>;
}
