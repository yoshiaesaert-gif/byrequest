import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { activeProvider, PROVIDERS } from "@/config/compliance";
import { appUrl } from "./url";

/* Provider independent adapters. Each real provider gets its own implementation of these
   interfaces once contracted; the onboarding flow and access rules do not change. */

export type IdentityEvent = {
  eventId: string; occurredAt: Date; externalRef: string;
  decision: "approved" | "declined" | "resubmit" | "expired";
  over18?: boolean | null; documentChecked?: boolean; livenessChecked?: boolean;
  person?: { legalName?: string; dateOfBirth?: string; country?: string };
  missing?: string[]; reason?: string; expiresAt?: Date | null;
};

export type PayoutEvent = {
  eventId: string; occurredAt: Date; externalRef: string;
  status: "pending" | "action_required" | "approved" | "rejected";
  canReceivePayouts: boolean; canProcessSales: boolean;
  missing?: string[]; actionUrl?: string | null; reason?: string;
};

export interface IdentityAdapter {
  id: string;
  /* Starts a hosted verification: ID document, document to person match (liveness/selfie), age. */
  start(input: { subject: string; returnUrl: string }): Promise<{ externalRef: string; redirectUrl: string }>;
  verifyWebhook(raw: string, headers: Headers): IdentityEvent;     // throws when the signature is invalid
}

export interface PayoutAdapter {
  id: string;
  /* Fields this provider needs for a country and account type, before creating the account. */
  requirements(country: string, accountType: "individual" | "business"): Promise<string[]>;
  /* Either link an existing account at the provider (redirect) or create a payout account with fields. */
  link(input: { subject: string; returnUrl: string }): Promise<{ externalRef: string; redirectUrl: string }>;
  create(input: { subject: string; country: string; accountType: "individual" | "business"; fields: Record<string, string> }): Promise<{ externalRef: string; status: PayoutEvent["status"]; missing: string[]; actionUrl: string | null }>;
  update(input: { externalRef: string; fields: Record<string, string> }): Promise<{ status: PayoutEvent["status"]; missing: string[]; actionUrl: string | null }>;
  verifyWebhook(raw: string, headers: Headers): PayoutEvent;
}

export class SignatureError extends Error {}

/* Signature scheme of the test provider: t=<unix>,v1=<hex hmac of "t.body">, five minute tolerance.
   Real adapters implement the scheme documented by their provider. */
export function signTest(raw: string, at = Math.floor(Date.now() / 1000)) {
  return `t=${at},v1=${createHmac("sha256", testSecret()).update(`${at}.${raw}`).digest("hex")}`;
}
function verifyTest(raw: string, header: string | null) {
  const m = /t=(\d+),v1=([a-f0-9]{64})/.exec(header ?? "");
  if (!m) throw new SignatureError("missing signature");
  if (Math.abs(Date.now() / 1000 - Number(m[1])) > 300) throw new SignatureError("stale signature");
  const want = Buffer.from(createHmac("sha256", testSecret()).update(`${m[1]}.${raw}`).digest("hex"));
  const got = Buffer.from(m[2]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) throw new SignatureError("bad signature");
}
const testSecret = () => process.env.SANDBOX_WEBHOOK_SECRET || "sandbox-dev-secret";


const sandboxIdentity: IdentityAdapter = {
  id: "sandbox",
  async start() {
    const externalRef = "sbx_id_" + randomUUID().slice(0, 18);
    return { externalRef, redirectUrl: `${appUrl()}/sandbox/identity/${externalRef}` };
  },
  verifyWebhook(raw, headers) {
    verifyTest(raw, headers.get("x-sandbox-signature"));
    const j = JSON.parse(raw);
    return { ...j, occurredAt: new Date(j.occurredAt), expiresAt: j.expiresAt ? new Date(j.expiresAt) : null };
  },
};

/* The test provider asks for a generic set of fields. These are not the requirements of any real provider. */
const sandboxPayout: PayoutAdapter = {
  id: "sandbox",
  async requirements(_country, type) {
    return type === "business" ? ["company_name", "registration_number", "vat_number", "iban"] : ["account_holder", "iban"];
  },
  async link() {
    const externalRef = "sbx_acct_" + randomUUID().slice(0, 16);
    return { externalRef, redirectUrl: `${appUrl()}/sandbox/payout/${externalRef}?mode=link` };
  },
  async create({ fields, accountType }) {
    const externalRef = "sbx_acct_" + randomUUID().slice(0, 16);
    const need = await this.requirements("", accountType);
    const missing = need.filter((k) => !fields[k]);
    return { externalRef, status: missing.length ? "action_required" : "pending", missing, actionUrl: `${appUrl()}/sandbox/payout/${externalRef}` };
  },
  async update({ externalRef }) { return { status: "pending", missing: [], actionUrl: `${appUrl()}/sandbox/payout/${externalRef}` }; },
  verifyWebhook(raw, headers) {
    verifyTest(raw, headers.get("x-sandbox-signature"));
    const j = JSON.parse(raw);
    return { ...j, occurredAt: new Date(j.occurredAt) };
  },
};

/* Didit (didit.me): hosted ID document check, liveness and face match. A session is created with the
   API key; the decision arrives by webhook, signed with HMAC SHA256 (X-Signature-V2 over the JSON with
   sorted keys, or X-Signature over the raw body), five minute tolerance. Statuses that are not final
   are acknowledged and ignored. */
export class IgnoredEvent extends Error {}
const diditBase = () => process.env.DIDIT_BASE_URL || "https://verification.didit.me";
const sortedJson = (v: unknown): string => {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(sortedJson).join(",") + "]";
  return "{" + Object.keys(v as object).sort().map((k) => JSON.stringify(k) + ":" + sortedJson((v as Record<string, unknown>)[k])).join(",") + "}";
};
const hexEq = (a: string, b: string) => { const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex"); return x.length > 0 && x.length === y.length && timingSafeEqual(x, y); };
const ageFrom = (dob?: string) => { if (!dob) return null; const d = new Date(dob); if (isNaN(+d)) return null; const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };

const diditIdentity: IdentityAdapter = {
  id: "didit",
  async start({ subject, returnUrl }) {
    const r = await fetch(`${diditBase()}/v3/session/`, {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { "content-type": "application/json", "x-api-key": process.env.DIDIT_API_KEY ?? "" },
      body: JSON.stringify({ workflow_id: process.env.DIDIT_WORKFLOW_ID, vendor_data: subject, callback: returnUrl }),
    });
    if (r.status !== 201 && r.status !== 200) throw new Error(`didit session ${r.status}`);
    const j = (await r.json()) as { session_id: string; url: string };
    return { externalRef: j.session_id, redirectUrl: j.url };
  },
  verifyWebhook(raw, headers) {
    const secret = process.env.DIDIT_WEBHOOK_SECRET ?? "";
    const body = JSON.parse(raw) as Record<string, unknown> & { session_id: string; status: string; created_at?: number; timestamp?: number; decision?: Record<string, unknown> };
    const ts = Number(headers.get("x-timestamp") ?? body.timestamp ?? body.created_at);
    if (!secret || !Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) throw new SignatureError("stale or unsigned");
    const v2 = headers.get("x-signature-v2"), v1 = headers.get("x-signature"), vs = headers.get("x-signature-simple");
    const mac = (x: string) => createHmac("sha256", secret).update(x, "utf8").digest("hex");
    const ok = (v2 && hexEq(mac(sortedJson(body)), v2)) || (v1 && hexEq(mac(raw), v1))
      || (vs && hexEq(mac(`${headers.get("x-timestamp") ?? body.timestamp ?? body.created_at}:${body.session_id}:${body.status}:${body.webhook_type}`), vs));
    if (!ok) throw new SignatureError("bad signature");
    const st = String(body.status);
    const decision = st === "Approved" ? "approved" : st === "Declined" ? "declined" : st === "Expired" || st === "Abandoned" ? "expired" : st === "Resubmitted" ? "resubmit" : null;
    if (!decision) throw new IgnoredEvent(st);
    const d = (body.decision ?? {}) as Record<string, unknown>;
    const idv = ((d.id_verification ?? (Array.isArray(d.id_verifications) ? d.id_verifications[0] : null)) ?? {}) as Record<string, string | undefined>;
    const age = ageFrom(idv.date_of_birth);
    return {
      eventId: `${body.session_id}:${st}:${ts}`, occurredAt: new Date(ts * 1000), externalRef: body.session_id, decision,
      over18: age === null ? null : age >= 18, documentChecked: decision === "approved", livenessChecked: decision === "approved",
      person: { legalName: [idv.first_name, idv.last_name].filter(Boolean).join(" ") || undefined, dateOfBirth: idv.date_of_birth, country: idv.issuing_state ?? idv.nationality },
      reason: decision === "approved" ? undefined : st,
    };
  },
};

const IDENTITY: Record<string, IdentityAdapter> = { sandbox: sandboxIdentity, didit: diditIdentity };
const PAYOUT: Record<string, PayoutAdapter> = { sandbox: sandboxPayout };

export function identityAdapter(): IdentityAdapter | null { const p = activeProvider("identity"); return p ? IDENTITY[p.id] ?? null : null; }
export function payoutAdapter(): PayoutAdapter | null { const p = activeProvider("payout"); return p ? PAYOUT[p.id] ?? null : null; }
export function adapterById(kind: "identity" | "payout", id: string) {
  const p = PROVIDERS[id];
  if (!p || p.id !== activeProvider(kind)?.id) return null;   // webhooks only for the active provider of this environment
  return kind === "identity" ? IDENTITY[id] ?? null : PAYOUT[id] ?? null;
}
