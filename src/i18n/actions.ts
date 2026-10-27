"use server";
import { cookies } from "next/headers";
import { isLocale } from "./config";

export async function setLanguage(l: string) {
  if (!isLocale(l)) return;
  (await cookies()).set("brq_lang", l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
