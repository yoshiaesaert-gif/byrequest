/* Local scheduler: calls the cron endpoint every minute. In production use the platform scheduler. */
import "dotenv/config";
const url = process.env.INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
async function tick() {
  try {
    const r = await fetch(`${url}/api/cron`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    console.log(new Date().toISOString(), r.status, await r.text());
  } catch (e) { console.error("worker", e); }
}
tick(); setInterval(tick, 60_000);
