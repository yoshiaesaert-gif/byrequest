import { runDue } from "@/server/deals";
import { purgeExpired } from "@/server/privacy";
import { fillTranslations } from "@/server/translate";
import { runLifecycle } from "@/server/lifecycle";
import { closeShares } from "@/server/albums";
import { purgeVisits } from "@/server/analytics";

/* Called every minute by the scheduler (or npm run worker). Releases payments after the
   24 hour objection window, refunds missed deadlines and removes expired vault items. */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Forbidden", { status: 403 });
  return Response.json({ ...(await runDue()), purged: await purgeExpired(), translated: await fillTranslations(), previews: await closeShares(), visitsPurged: new Date().getUTCMinutes() === 7 ? await purgeVisits() : 0, mail: await runLifecycle().catch((e) => ({ error: String(e) })) });
}
