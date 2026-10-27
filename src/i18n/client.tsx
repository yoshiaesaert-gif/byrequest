"use client";
import { createContext, useContext, useMemo } from "react";
import { translator, type Locale } from "./config";
import { DICTS } from "./dicts";

const Ctx = createContext<Locale>("en");
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}
export function useT() {
  const l = useContext(Ctx);
  return useMemo(() => translator(DICTS[l]), [l]);
}
export function useLocale() { return useContext(Ctx); }
