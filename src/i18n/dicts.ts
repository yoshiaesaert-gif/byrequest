import type { Dict, Locale } from "./config";
import nl from "./nl";
import fr from "./fr";

export const DICTS: Record<Locale, Dict> = { en: {}, nl, fr };
