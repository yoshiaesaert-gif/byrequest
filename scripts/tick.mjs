/* Production scheduler: calls the cron endpoint every minute. Plain node, no tsx, so it costs a few MB. */
const url = process.env.INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
async function tick() {
  try {
    const r = await fetch(`${url}/api/cron`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(55_000) });
    console.log(new Date().toISOString(), r.status, await r.text());
  } catch (e) { console.error("worker", String(e)); }
}
tick(); setInterval(tick, 60_000);
