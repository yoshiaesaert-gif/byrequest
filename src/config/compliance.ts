/* Provider and country configuration. Nothing here claims that a real provider accepts ByRequest:
   the real providers are listed as candidates with status "not_contracted" and no requirements,
   because their requirements may only be filled in from their written specifications.
   Until a live provider is contracted, only the clearly marked test provider runs, and only
   when BRQ_PROVIDER_ENV is "test". */

export type Env = "test" | "live";
export const PROVIDER_ENV: Env = process.env.BRQ_PROVIDER_ENV === "live" ? "live" : "test";

export type ProviderInfo = {
  id: string;
  label: string;
  env: Env;
  status: "test_only" | "not_contracted" | "contracted";
  roles: ("identity" | "payout" | "payments")[];
  note: string;
};

export const PROVIDERS: Record<string, ProviderInfo> = {
  sandbox: { id: "sandbox", label: "Test provider (simulated)", env: "test", status: "test_only", roles: ["identity", "payout", "payments"], note: "Simulated outcomes for development and QA. Never a production check." },
  pay: { id: "pay", label: "PAY.", env: "live", status: "not_contracted", roles: ["payments", "payout"], note: "Candidate. Model not yet reviewed or approved." },
  verotel: { id: "verotel", label: "Verotel / Yoursafe", env: "live", status: "not_contracted", roles: ["payments", "payout", "identity"], note: "Candidate. Model not yet reviewed or approved." },
  segpay: { id: "segpay", label: "Segpay", env: "live", status: "not_contracted", roles: ["payments", "payout"], note: "Candidate. Model not yet reviewed or approved." },
  ccbill: { id: "ccbill", label: "CCBill", env: "live", status: "not_contracted", roles: ["payments", "payout"], note: "Candidate. Model not yet reviewed or approved." },
};

/* The provider used for each role in this environment. A live provider must be contracted. */
export function activeProvider(role: "identity" | "payout"): ProviderInfo | null {
  const id = role === "identity" ? process.env.BRQ_IDENTITY_PROVIDER : process.env.BRQ_PAYOUT_PROVIDER;
  const p = PROVIDERS[id || (PROVIDER_ENV === "test" ? "sandbox" : "")];
  if (!p || !p.roles.includes(role)) return null;
  if (p.env !== PROVIDER_ENV) return null;
  if (p.env === "live" && p.status !== "contracted") return null;
  return p;
}

/* Countries where creator payouts are offered at launch (Benelux first). Which of these each
   provider supports is a provider decision and must be confirmed per provider. */
export const PAYOUT_COUNTRIES: { code: string; name: string }[] = [
  { code: "BE", name: "Belgium" }, { code: "NL", name: "Netherlands" }, { code: "LU", name: "Luxembourg" },
  { code: "DE", name: "Germany" }, { code: "FR", name: "France" }, { code: "GB", name: "United Kingdom" },
  { code: "ES", name: "Spain" }, { code: "IT", name: "Italy" }, { code: "IE", name: "Ireland" },
];

/* Field catalogue. Which fields are shown comes from the provider adapter per country and
   account type; the catalogue only defines how each field looks. */
export const FIELDS: Record<string, { label: string; help?: string; type?: "text" | "iban"; optional?: boolean }> = {
  account_holder: { label: "Account holder name", help: "Must match the name on your verified ID." },
  iban: { label: "IBAN", type: "iban" },
  company_name: { label: "Registered company name" },
  registration_number: { label: "Company registration number" },
  vat_number: { label: "VAT number" },
  tax_id: { label: "Tax identification number", help: "Asked by the provider for tax reporting." },
  business_address: { label: "Registered business address" },
};

/* Content review before anything is made available. "human" means a trained reviewer approves
   every delivery. Which combination of automated and human checks is sufficient must be agreed in
   writing with the payment partner; "test_auto" exists only for automated tests in the test env. */
export const REVIEW_MODE: "human" | "test_auto" = PROVIDER_ENV === "test" && process.env.BRQ_REVIEW_MODE === "test_auto" ? "test_auto" : "human";

/* Retention per data type. Values are placeholders until confirmed by legal counsel and the
   payment partner, who may require longer statutory retention. */
export const RETENTION = {
  identityResultYears: 7,       // TO CONFIRM: provider and record keeping obligations
  confidentialIdentityYears: 7, // TO CONFIRM
  consentEvidenceYears: 10,     // TO CONFIRM: evidence of agreement acceptance
  participantRecordsYears: 10,  // TO CONFIRM: may follow content availability plus statutory period
  removalRequestYears: 3,       // TO CONFIRM
};

export const STEP_UP_MINUTES = 10;
