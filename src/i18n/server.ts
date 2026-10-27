import "server-only";
import { cookies, headers } from "next/headers";
import { fromAcceptLanguage, isLocale, translator, type Locale } from "./config";
import { DICTS } from "./dicts";

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("brq_lang")?.value;
  if (isLocale(c)) return c;
  return fromAcceptLanguage((await headers()).get("accept-language"));
}
export async function getT() {
  const l = await getLocale();
  return { t: translator(DICTS[l]), locale: l };
}
