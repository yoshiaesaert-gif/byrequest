"use server";
import { idRecord } from "@/server/idrecord";

export async function showId(userId: string) {
  try { return await idRecord(userId); } catch { return { ok: false as const, error: "Could not load the ID details." }; }
}
