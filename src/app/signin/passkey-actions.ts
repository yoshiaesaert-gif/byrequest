"use server";
import { revalidatePath } from "next/cache";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";
import { requireUser } from "@/server/auth";
import * as pk from "@/server/passkeys";
import { RuleError } from "@/domain/rules";

type R<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
async function run<T>(fn: () => Promise<T>): Promise<R<T>> {
  try { return { ok: true, data: await fn() }; }
  catch (e) { if (e instanceof RuleError) return { ok: false, error: e.message }; console.error("passkey", e instanceof Error ? e.message : e); return { ok: false, error: "That did not work. Try again or use your email code." }; }
}

export const passkeyRegisterOptions = async () => run(async () => { const u = await requireUser(); return pk.registrationOptions(u); });
export const passkeyRegister = async (r: RegistrationResponseJSON) => run(async () => { const u = await requireUser(); await pk.register(u.id, r); revalidatePath("/settings"); });
export const passkeyLoginOptions = async () => run(() => pk.authenticationOptions());
export const passkeyLogin = async (r: AuthenticationResponseJSON) => run(async () => { const u = await pk.authenticate(r); return { creator: u.isCreator }; });
export const passkeyRemove = async (id: string) => run(async () => { const u = await requireUser(); await pk.removePasskey(u.id, id); revalidatePath("/settings"); });
