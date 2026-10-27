"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as P from "@/server/participants";
import { RuleError } from "@/domain/rules";

export async function verify(token: string) {
  const url = await P.startParticipantIdentity(token).catch((e) => { if (e instanceof RuleError) return null; throw e; });
  if (url) redirect(url);
}
export async function give(token: string, deliveryId: string) {
  await P.consent(token, deliveryId, true, true);
  revalidatePath(`/consent/${token}`);
}
export async function decline(token: string, deliveryId: string) {
  await P.withdraw(token, deliveryId);
  revalidatePath(`/consent/${token}`);
}
