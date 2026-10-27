import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { activeProvider, PROVIDERS } from "@/config/compliance";

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

const appUrl = () => process.env.APP_URL || "http://localhost:3000";

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

const IDENTITY: Record<string, IdentityAdapter> = { sandbox: sandboxIdentity };
const PAYOUT: Record<string, PayoutAdapter> = { sandbox: sandboxPayout };

export function identityAdapter(): IdentityAdapter | null { const p = activeProvider("identity"); return p ? IDENTITY[p.id] ?? null : null; }
export function payoutAdapter(): PayoutAdapter | null { const p = activeProvider("payout"); return p ? PAYOUT[p.id] ?? null : null; }
export function adapterById(kind: "identity" | "payout", id: string) {
  const p = PROVIDERS[id];
  if (!p || p.id !== activeProvider(kind)?.id) return null;   // webhooks only for the active provider of this environment
  return kind === "identity" ? IDENTITY[id] ?? null : PAYOUT[id] ?? null;
}
