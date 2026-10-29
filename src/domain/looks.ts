/* The ready made 3D avatars in public/av. The first ten were the original set; p01 to p30 came later.
   Left out on purpose: avatars with religious clothing, which do not fit this platform. */
const RETIRED = new Set(["nour", "p14"]);
export const LOOKS = ["kai", "milo", "ava", "dre", "lina", "jens", "nour", "noah", "ruby", "sem", ...Array.from({ length: 30 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`)].filter((l) => !RETIRED.has(l));
/* Replacements for accounts that still use a retired avatar. */
export const REPLACED: Record<string, string> = { nour: "p29", p14: "p20" };
