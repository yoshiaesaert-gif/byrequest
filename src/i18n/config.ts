/* Languages of the site. English strings are the keys; nl and fr dictionaries translate them by
   hand. A string missing from a dictionary falls back to English, never to an empty label. */
export const LOCALES = ["nl", "en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "nl";
export const LOCALE_LABEL: Record<Locale, string> = { nl: "Nederlands", en: "English", fr: "Français" };
export const LANG_NAME: Record<Locale, Record<Locale, string>> = {
  nl: { nl: "Nederlands", en: "Engels", fr: "Frans" },
  en: { nl: "Dutch", en: "English", fr: "French" },
  fr: { nl: "néerlandais", en: "anglais", fr: "français" },
};
export const isLocale = (x: unknown): x is Locale => typeof x === "string" && (LOCALES as readonly string[]).includes(x);

/* Best match from an Accept-Language header, for a first visit without a chosen language. */
export function fromAcceptLanguage(h: string | null): Locale {
  for (const part of (h ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export type Dict = Record<string, string>;
export function translator(dict: Dict) {
  return (s: string, vars?: Record<string, string | number>) => {
    let out = dict[s] ?? s;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    return out;
  };
}
export type T = ReturnType<typeof translator>;
