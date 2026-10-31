/* Runs once when the server starts: sends phone and browser notifications every few seconds. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { dispatchPush } = await import("./server/push");
  let busy = false;
  setInterval(async () => {
    if (busy) return; busy = true;
    try { await dispatchPush(); } catch (e) { console.error("push loop", e instanceof Error ? e.message : e); } finally { busy = false; }
  }, 5000);
}
