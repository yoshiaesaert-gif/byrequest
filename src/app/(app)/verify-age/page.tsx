import { getT } from "@/i18n/server";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { isAgeVerified, startBuyerAge } from "@/server/onboarding";
import { appUrl } from "@/server/url";
import { PROVIDER_ENV } from "@/config/compliance";
import { I } from "@/components/ui";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export default async function VerifyAge({ searchParams }: { searchParams: Promise<{ next?: string; back?: string }> }) {
  const { t } = await getT();
  const u = await requireUser();
  const sp = await searchParams;
  const jar = await cookies();
  const next = safeNext(sp.next ?? jar.get("brq_next")?.value);
  const ok = await isAgeVerified(u.id);
  async function go() {
    "use server";
    const me = await requireUser();
    (await cookies()).set("brq_next", next, { httpOnly: true, sameSite: "lax", maxAge: 1800, path: "/" });
    redirect(await startBuyerAge(me.id, `${appUrl()}/verify-age?back=1`));
  }
  return (<div className="wrap"><div className="va">
    <span className="eyebrow">{t("One time check")}</span>
    {ok ? (<>
      <h1 className="t-h1">{t("Your age is confirmed")}</h1>
      <p className="muted">{t("Thanks. You will not be asked again.")}</p>
      <Link href={next} className="btn btn-primary btn-lg">{t("Continue")}</Link>
    </>) : sp.back ? (<>
      <h1 className="t-h1">{t("Waiting for the result")}</h1>
      <p className="muted">{t("The verification partner sends the result to us directly. This usually takes a few seconds. Refresh this page in a moment.")}</p>
      <Link href="/verify-age" className="btn btn-secondary">{t("Refresh")}</Link>
    </>) : (<>
      <h1 className="t-h1">{t("Confirm you are 18 or older")}</h1>
      <p className="muted">{t("ByRequest is for adults only. Before you pay or open your vault, you confirm your age once with our verification partner.")}</p>
      <ul className="va-list">
        <li><I n="shield" c="sm" />{t("The partner checks your age. ByRequest receives only the result: 18 or older, yes or no.")}</li>
        <li><I n="eyeoff" c="sm" />{t("We never receive or store your ID, your name or your date of birth from this check.")}</li>
        <li><I n="lock" c="sm" />{t("Creators and other buyers never see that you did this.")}</li>
      </ul>
      <form action={go}><button className="btn btn-primary btn-lg">{t("Start the check")}</button></form>
    </>)}
  </div></div>);
}
