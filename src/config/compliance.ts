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
  env: Env | "any";                                   // "any": a real provider that also runs while payments are still simulated
  status: "test_only" | "not_contracted" | "contracted";
  roles: ("identity" | "payout" | "payments")[];
  note: string;
};

export const PROVIDERS: Record<string, ProviderInfo> = {
  didit: { id: "didit", label: "Didit", env: "any", status: "contracted", roles: ["identity"], note: "ID document, liveness and face match on the free plan. Set DIDIT_API_KEY, DIDIT_WORKFLOW_ID and DIDIT_WEBHOOK_SECRET." },
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
  if (p.env !== "any" && p.env !== PROVIDER_ENV) return null;
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
  chatMonthsAfterDeal: 12,      // TO CONFIRM: encrypted chats, counted from the end of the deal
  notificationMonths: 12,
  reportContactMonths: 12,      // contact details of a closed report
};

export const STEP_UP_MINUTES = 10;

/* VAT on what the buyer pays, by the buyer's country, in basis points. Standard rates for
   electronically supplied services. OPEN DECISION: confirm the deemed supplier treatment, OSS
   registration and these rates with the accountant before going live. */
export const VAT_RATES: Record<string, number> = { BE: 2100, NL: 2100, LU: 1700, DE: 1900, FR: 2000, ES: 2100, IT: 2200, IE: 2300 };
export const vatRate = (country: string) => VAT_RATES[country] ?? 2100;
export const BUYER_COUNTRIES = [["BE", "Belgium"], ["NL", "Netherlands"], ["LU", "Luxembourg"], ["DE", "Germany"], ["FR", "France"]] as const;

/* Categories open at launch. Worn items are physical goods: shipping exposes home addresses, which
   breaks the anonymity ByRequest promises, and adds hygiene and shipping rules. Off until solved. */
export const ENABLED_CATEGORIES = ["video", "photos", "voice", "custom"] as const;

/* Buyers verify their age once with the identity provider before they pay or open the vault.
   A typed birth year is not enough for adult content (Commission guidelines on DSA art. 28). */
export const BUYER_AGE_CHECK = process.env.BRQ_BUYER_AGE_CHECK !== "off";

/* Demo mode: the test environment shown to colleagues and partners, filled with fictional
   creators, deals and reviews (all on @demo.byrequest.app accounts, removed before launch).
   It is never on in a live environment. Set BRQ_DEMO=0 to see the test environment without it. */
export const DEMO_MODE = PROVIDER_ENV === "test" && process.env.BRQ_DEMO !== "0";
