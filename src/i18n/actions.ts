"use server";
import { cookies } from "next/headers";
import { isLocale } from "./config";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";

export async function setLanguage(l: string) {
  if (!isLocale(l)) return;
  (await cookies()).set("brq_lang", l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const u = await currentUser();                       // emails follow the language someone picks
  if (u && u.lang !== l) await db.update(schema.users).set({ lang: l }).where(eq(schema.users.id, u.id));
}
