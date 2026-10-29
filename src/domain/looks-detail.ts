/* What a creator tells about how they look, beyond the basics. Gender is shown with the profile;
   the intimate details only to buyers this creator applied to or has a deal with, never publicly. */
export const GENDER = ["man", "woman", "nonbinary"] as const;
export const BODY_HAIR = ["smooth", "light", "hairy"] as const;
export const PUBIC = ["shaved", "trimmed", "natural"] as const;
export const SIZE = ["under_14", "14_16", "16_18", "18_20", "over_20"] as const;
export const CUT = ["cut", "uncut"] as const;
export const CUP = ["a", "b", "c", "d", "dd_plus"] as const;
export type Detail = { gender?: (typeof GENDER)[number]; bodyHair?: (typeof BODY_HAIR)[number]; pubic?: (typeof PUBIC)[number]; size?: (typeof SIZE)[number]; cut?: (typeof CUT)[number]; cup?: (typeof CUP)[number] };

export const LABEL: Record<string, string> = {
  man: "Man", woman: "Woman", nonbinary: "Non-binary",
  smooth: "Smooth", light: "A little hair", hairy: "Hairy",
  shaved: "Shaved", trimmed: "Trimmed", natural: "Natural",
  under_14: "Under 14 cm", "14_16": "14 to 16 cm", "16_18": "16 to 18 cm", "18_20": "18 to 20 cm", over_20: "Over 20 cm",
  cut: "Yes", uncut: "No",
  a: "A cup", b: "B cup", c: "C cup", d: "D cup", dd_plus: "DD or bigger",
};
const pick = <T extends readonly string[]>(list: T, v: unknown) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined);
export function cleanDetail(v: Record<string, unknown>): Detail {
  return { gender: pick(GENDER, v.gender), bodyHair: pick(BODY_HAIR, v.bodyHair), pubic: pick(PUBIC, v.pubic), size: pick(SIZE, v.size), cut: pick(CUT, v.cut), cup: pick(CUP, v.cup) };
}

/* Fixed choices for the basic looks, so profiles read the same and buyers can compare. */
export const BUILD = ["Slim", "Athletic", "Muscular", "Average", "Stocky", "Curvy", "Big"] as const;
export const HAIR = ["Black", "Dark brown", "Brown", "Light brown", "Blond", "Red", "Grey", "Shaved head", "Bald"] as const;
export const EYES = ["Brown", "Dark brown", "Hazel", "Green", "Blue", "Grey"] as const;
export const TATTOOS = ["No tattoos", "One or two", "Several", "Many"] as const;
export const HEIGHTS = Array.from({ length: 66 }, (_, i) => 145 + i);   // 145 to 210 cm

/* What a buyer needs to picture a creator before choosing. Without these, applying is not possible. */
export type ProfileBasics = { bio?: string | null; heightCm?: number | null; build?: string | null; hair?: string | null; eyes?: string | null; detail?: Detail | null };
export function profileMissing(p: ProfileBasics | null | undefined): string[] {
  const m: string[] = [];
  if (!p?.bio || p.bio.trim().length < 20) m.push("A short bio");
  if (!p?.detail?.gender) m.push("Gender");
  if (!p?.heightCm) m.push("Height");
  if (!p?.build?.trim()) m.push("Build");
  if (!p?.hair?.trim()) m.push("Hair");
  if (!p?.eyes?.trim()) m.push("Eyes");
  if (!p?.detail?.bodyHair) m.push("Body hair");
  if (!p?.detail?.pubic) m.push("Pubic hair");
  return m;
}
