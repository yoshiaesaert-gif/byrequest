/* Cover selection. The buyer does not pick a photo: the board would get repetitive. We match the
   request to a mood family, then take the photo used least on the open board, never one of the most
   recent covers. Pure, so it is unit tested. */
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `c${String(a + i).padStart(2, "0")}`);
export const FAMILIES: Record<string, string[]> = {
  shower: range(1, 5), workout: range(6, 10), morning: range(11, 15), night: range(16, 20), outfit: range(21, 25), custom: range(26, 30),
};

export function family(category: string, title: string): string {
  const t = title.toLowerCase();
  if (/shower|bath|steam|wet|mirror/.test(t)) return "shower";
  if (/gym|workout|training|match|sport|kit|sweat/.test(t)) return "workout";
  if (/morning|woke|coffee|breakfast|routine/.test(t)) return "morning";
  if (/night|sleep|bed|late|whisper|dark/.test(t)) return "night";
  if (/outfit|fit check|selfie|sneaker|denim|wear|look/.test(t)) return "outfit";
  return category === "voice" ? "night" : category === "photos" ? "outfit" : category === "custom" ? "custom" : "shower";
}

export function pickCover(pool: string[], usage: Record<string, number>, recent: string[], rnd = Math.random): string {
  const fresh = pool.filter((c) => !recent.includes(c));
  const options = fresh.length ? fresh : pool;
  const min = Math.min(...options.map((c) => usage[c] ?? 0));
  const best = options.filter((c) => (usage[c] ?? 0) === min);
  return best[Math.floor(rnd() * best.length)];
}
