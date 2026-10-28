import type { Dict, Locale } from "./config";
import nl from "./nl";
import fr from "./fr";
import en from "./en";

export const DICTS: Record<Locale, Dict> = { en, nl, fr };
