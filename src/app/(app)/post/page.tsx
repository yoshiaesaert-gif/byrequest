import { requireUser } from "@/server/auth";
import { isAgeVerified } from "@/server/onboarding";
import { BUYER_AGE_CHECK, vatRate } from "@/config/compliance";
import { WAIVER_TEXT } from "@/server/deals";
import Wizard from "./wizard";

export default async function Post({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const c = ["video", "photos", "voice", "custom"].includes(sp.c ?? "") ? sp.c! : "video";
  return <Wizard initial={{ category: c as "video", amount: Number(sp.amount) || 0, title: sp.title ?? "", details: sp.d ?? "", budget: Number(sp.budget) || 0 }} vatBp={vatRate(u.country ?? "BE")} freeFee={u.freeFees > 0} ageOk={!BUYER_AGE_CHECK || (await isAgeVerified(u.id))} waiver={WAIVER_TEXT} />;
}
