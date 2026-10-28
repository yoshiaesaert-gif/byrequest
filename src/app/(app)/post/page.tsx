import { requireUser } from "@/server/auth";
import { isAgeVerified } from "@/server/onboarding";
import { BUYER_AGE_CHECK, vatRate } from "@/config/compliance";
import { WAIVER_TEXT } from "@/server/deals";
import { categoryStats } from "@/server/queries";
import Wizard from "./wizard";

export default async function Post({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const stats = await categoryStats();
  const bands = Object.fromEntries(Object.entries(stats).map(([k, s]) => [k, [Math.round(s.lo / 100), Math.round(s.hi / 100)]])) as Record<string, [number, number]>;
  const c = ["video", "photos", "voice", "custom"].includes(sp.c ?? "") ? sp.c! : "video";
  return <Wizard initial={{ category: c as "video", amount: Number(sp.amount) || (c === "photos" ? 6 : c === "voice" ? 2 : 10), title: sp.title ?? "", budget: Number(sp.budget) || 0 }} bands={bands} vatBp={vatRate(u.country ?? "BE")} ageOk={!BUYER_AGE_CHECK || (await isAgeVerified(u.id))} waiver={WAIVER_TEXT} />;
}
