import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

/* Where the ID check sends people back. On the device that is signed in (the laptop) setup simply
   continues. On the phone that only scanned the QR code there is nothing left to do: say so. */
export default async function Verified({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const to = (await searchParams).to === "age" ? "/verify-age?back=1" : "/onboarding?step=identity";
  if (await currentUser()) redirect(to);
  const { t } = await getT();
  return (<div className="sbx" style={{ background: "var(--paper)" }}><div className="card" style={{ width: "min(460px,100%)", display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center", padding: 32 }}>
    <img src="/logo.png" alt="byrequest" style={{ height: 30 }} />
    <span style={{ width: 64, height: 64, borderRadius: 999, background: "#E3F7EC", display: "grid", placeItems: "center", color: "#16804A" }}><svg className="ico lg" aria-hidden="true"><use href="#i-check" /></svg></span>
    <h1 className="t-h2">{t("Done on this phone")}</h1>
    <p className="muted">{t("Your check was sent. Go back to your computer: setup continues there by itself. You can close this window.")}</p>
  </div></div>);
}
