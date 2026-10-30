"use server";
import { revalidatePath } from "next/cache";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";
import { requireUser } from "@/server/auth";
import * as pk from "@/server/passkeys";
import * as link from "@/server/devicelink";
import { RuleError } from "@/domain/rules";

type R<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
async function run<T>(fn: () => Promise<T>): Promise<R<T>> {
  try { return { ok: true, data: await fn() }; }
  catch (e) { if (e instanceof RuleError) return { ok: false, error: e.message }; console.error("passkey", e instanceof Error ? e.message : e); return { ok: false, error: "That did not work. Try again or use your email code." }; }
}

export const passkeyRegisterOptions = async () => run(async () => { const u = await requireUser(); return pk.registrationOptions(u); });
export const passkeyRegister = async (r: RegistrationResponseJSON) => run(async () => { const u = await requireUser(); await pk.register(u.id, r); revalidatePath("/", "layout"); });
export const passkeyLoginOptions = async () => run(() => pk.authenticationOptions());
export const passkeyLogin = async (r: AuthenticationResponseJSON) => run(async () => { const u = await pk.authenticate(r); return { creator: u.isCreator, uid: u.id, credId: u.credId, box: u.keyBox, account: u.publicKey }; });
export const passkeyRemove = async (id: string) => run(async () => { const u = await requireUser(); await pk.removePasskey(u.id, id); revalidatePath("/settings"); });

/* Chat key: lock it with a passkey, or pass it from one of your devices to a new one. The server
   only ever sees boxes it cannot open. */
export const unlockOptions = async () => run(async () => { const u = await requireUser(); return pk.unlockOptions(u.id); });
export const unlockVerify = async (r: AuthenticationResponseJSON) => run(async () => { const u = await requireUser(); return pk.unlockVerify(u.id, r); });
export const saveKeyBox = async (id: string, box: string) => run(async () => { const u = await requireUser(); await pk.saveKeyBox(u.id, id, box); });
export const linkStart = async (pub: string, device: string) => run(async () => { const u = await requireUser(); return link.start(u.id, pub, device); });
export const linkCollect = async (id: string) => run(async () => { const u = await requireUser(); return link.collect(u.id, id); });
export const linkPending = async () => run(async () => { const u = await requireUser(); return link.pending(u.id); });
export const linkApprove = async (id: string, box: string) => run(async () => { const u = await requireUser(); await link.approve(u.id, id, box); });
export const linkRefuse = async (id: string) => run(async () => { const u = await requireUser(); await link.refuse(u.id, id); });
