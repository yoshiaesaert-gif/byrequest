/* The ready made 3D avatars in public/av. The first ten were the original set; p01 to p30 came later. */
export const LOOKS = ["kai", "milo", "ava", "dre", "lina", "jens", "nour", "noah", "ruby", "sem", ...Array.from({ length: 30 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`)];
