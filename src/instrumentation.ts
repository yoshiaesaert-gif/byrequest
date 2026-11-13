/* Runs once when the server starts: sends phone and browser notifications every few seconds. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { dispatchPush } = await import("./server/push");
  let busy = false;
  setInterval(async () => {
    if (busy) return; busy = true;
    try { await dispatchPush(); } catch (e) { console.error("push loop", e instanceof Error ? e.message : e); } finally { busy = false; }
  }, 15_000);   // every 15 seconds: quick enough for a phone notification, light on the database
  // One account per person: fingerprints for accounts verified before they existed.
  setTimeout(() => { import("./server/oneaccount").then((m) => m.backfillFingerprints()).then((n) => n && console.log(`fingerprints added: ${n}`)).catch((e) => console.error("fingerprint backfill", e instanceof Error ? e.message : e)); }, 15_000);
  // Share bonus: verified friends move to the approval queue, and inviters hear how far their link got.
  const { shareSweep } = await import("./server/sharebonus");
  let sweeping = false;
  setInterval(async () => {
    if (sweeping) return; sweeping = true;
    try { await shareSweep(); } catch (e) { console.error("share sweep", e instanceof Error ? e.message : e); } finally { sweeping = false; }
  }, 5 * 60_000);   // every 5 minutes is plenty for bonuses and levels
}
