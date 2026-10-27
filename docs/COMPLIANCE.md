# Creator onboarding and content compliance

This document describes how creator onboarding, verification, payouts, agreements, participants and content review work in the code, and lists every decision that still has to come from a payment partner, a verification provider or legal counsel. Nothing in the code assumes that PAY., Verotel / Yoursafe, Segpay or CCBill has approved the ByRequest model, or that a verification done for one provider is accepted by another.

## 1. Four steps

| Step | What happens | Where |
|---|---|---|
| A. Create your account | Email verified by code at sign in, unique username, avatar or blurred photo, acceptance of Terms and acknowledgement of the Privacy statement (current versions) | `/onboarding?step=account` |
| B. Verify your identity | Hosted verification at the identity provider: ID document, document to person match (liveness or selfie), minimum age 18. Legal name, date of birth and country come from the provider | `/onboarding?step=identity` |
| C. Set up payouts | Individual or business, country, then only the fields the active provider asks for. Either link an existing provider account or create a payout account. Any extra provider step is shown with an explicit button to the provider. Requires a fresh email code (step up) | `/onboarding?step=payouts` |
| D. Creator agreement | Short summary, link to the full text, explicit acceptance of a specific version | `/onboarding?step=agreement` |

Progress is saved after every step (`creator_onboarding.last_step` plus the area statuses), and the overview shows what is approved and what is missing. "You're ready to earn." is only shown when the derived status is `active`.

## 2. Statuses and access

Each area has its own status: `not_started`, `pending`, `action_required`, `approved`, `rejected`, `expired`. Account restrictions are `none`, `restricted`, `suspended`.

The creator status is derived in `src/domain/creator.ts`:

| Status | Rule |
|---|---|
| suspended | restriction suspended (also set automatically when the provider reports under 18) |
| restricted | restriction restricted |
| active | email, identity, payout and agreement all approved |
| action_required | any area action_required, rejected or expired |
| pending_verification | any area pending |
| draft | otherwise |

Capabilities, enforced on the server in `requireCap` (`src/server/onboarding.ts`):

1. Prepare a profile: allowed unless suspended.
2. Make offers: active, provider approved, and the provider allows sales.
3. Upload deliveries and preview albums: active and provider approved.
4. Receive payouts: active and the provider has enabled payouts. Otherwise a released payment is recorded as `payout_on_hold` and the creator is told "Action needed to enable payouts."

These checks run inside the server functions (`makeOffer`, `acceptOffer`, `deliver`, `answerAlbum`, the payout effect), so hidden buttons are never the only protection. A status sent by a client is never an input.

## 3. Public and confidential data

| Data | Table | Who can see it |
|---|---|---|
| Public profile | `users` (handle, avatar, ratings), `creator_profiles` | other signed in users, through `publicProfile` only |
| Verification results | `identity_checks` | staff, through the admin view |
| Legal name, date of birth, country | `confidential_identity`, AES-256-GCM sealed | admins only, with a stated purpose; every read is logged |
| Payout provider records | `payout_accounts` (reference, status, capabilities, missing items) | staff |
| Agreement evidence | `legal_documents`, `consents` | staff |

ByRequest stores provider references and results, not ID scans or biometric data. Bank and tax details are passed to the payout provider and not stored. Sexual preference is never asked. The user facing explanation is: "Your legal name and ID are not displayed on your profile. Verification is required for payments and safety."

Retention periods per data type are in `RETENTION` in `src/config/compliance.ts` and are placeholders until confirmed (see open decisions).

## 4. Agreement versioning

`legal_documents` holds each version with its text and SHA-256. `consents` records user, document id, kind, version, hash, method (`checkbox_and_button` or `acknowledged_link`) and time. The agreement area counts as approved only for a consent to the current version with the matching hash; publishing a new version makes it `action_required` until accepted again. The texts in `src/legal/documents.ts` are working drafts and are labelled as such everywhere they are shown. The creator agreement covers voluntary participation, prohibited content, rights in uploads, identity, age and consent of everyone shown, a personal licence to the buyer (no transfer of all rights), fees and payouts, moderation, complaints, removal and objection, and the limits of copy protection.

## 5. Other people in content

A creator adds each other person in the Studio and sends them a private link (`/consent/<token>`). That person verifies through the identity provider without an account, then gives consent per delivery (being shown, and this specific availability). A delivery that declares participants stays out of the vault until every participant is verified and has consented. Withdrawal removes it from the vault at once. Anyone can file a removal request at `/removal` without an account; contact details are sealed.

## 6. Three separate checks on content

1. Technical file check (`checkDelivery`): duration, count, format, resolution, silence for audio. It only reads file facts and is never a content approval. A file that fails cannot be sent.
2. Content review: every delivery and preview album waits in the review queue (`/admin`) until a trained reviewer approves it. `BRQ_REVIEW_MODE=test_auto` exists only for automated tests in the test environment.
3. Dispute review: after availability, the buyer has 24 hours to object; a reviewer compares the file with the terms of the accepted offer.

No automated scan is claimed to prove age or consent.

## 7. Providers and webhooks

Adapters in `src/server/providers.ts`:

| Interface | Methods |
|---|---|
| IdentityAdapter | `start`, `verifyWebhook` |
| PayoutAdapter | `requirements` (per country and account type), `link`, `create`, `update`, `verifyWebhook` |

Provider statuses are stored per provider (`payout_accounts` is unique per user and provider), so a creator can be approved at provider A and still need steps at provider B. Only the active provider for the current environment counts.

Webhooks arrive at `/api/webhooks/<identity|payout>/<provider>`. The signature is verified on the raw body first. Every event is recorded in `provider_events` with a unique key on provider and event id, so duplicates are a no-op, and an event older than the last applied one is stored as stale and ignored. The page a user returns to after an external step never sets a status.

The test provider (`sandbox`) runs only when `BRQ_PROVIDER_ENV=test`. Its pages are clearly marked "Test provider · simulated", every approval from it is stored with `env = test` and shown with a Test badge, and the onboarding shows a test environment banner. In `live` mode the sandbox is disabled and only providers marked `contracted` can be used.

ByRequest does not run its own escrow account or wallet. The `held` deal status means the payment provider holds the funds; the `ledger` table mirrors what the provider did.

## 8. Admin and support

`/admin` (staff only) shows the review queue, disputes, removal requests, every creator's derived status and areas, missing items and provider records. `/admin/creators/<id>` adds identity checks, payout accounts, agreement versions, participant and consent references, restrictions, appeals and the audit history.

Staff can request more information, set or lift restrictions (an age based suspension cannot be lifted there), answer appeals and, as admin, read confidential identity with a stated purpose. Staff cannot mark identity or payouts as approved; those change only through signed provider events.

## 9. Security notes

1. Payout changes require a fresh email code within 10 minutes.
2. Notifications, logs and analytics carry no sensitive content; webhook errors log only the error type.
3. Marketing consent is a separate optional setting and is never part of a required agreement.
4. Chat keys live per device. A new device cannot read older messages; secure multi device key sync is an open item.

## 10. Tests

`tests/compliance.test.ts` covers the acceptance criteria against Postgres:

1. A minor or failed verification never activates a creator (and suspends on under 18).
2. A forged signature or a client claim gives no access.
3. Duplicate and delayed webhooks cause no double or stale actions.
4. Confidential data is absent from public profile responses.
5. Missing participant verification or consent blocks availability, and a technical pass alone never makes content available.
6. Provider restrictions block payouts or sales, and hold payouts.
7. Agreement acceptance is traceable to the exact version and text hash, and a new version needs new acceptance.

## 11. Legal safeguards built in (Belgium and the Netherlands)

| Topic | What the code does | Where |
|---|---|---|
| Minors (DSA art. 28, Commission guidelines of 14 July 2025) | Buyers confirm their age once with the identity provider before paying or opening the vault; a typed birth year is not enough. Only the outcome is kept. A confirmed minor is closed with a statement of reasons. | `server/onboarding.ts` startBuyerAge, isAgeVerified; gates in `server/deals.ts`, vault pages, `api/media` |
| Belgian advertising ban with platform exemption (Criminal Code art. 433quater/2, royal decree of 18 May 2024) | Report form for exploitation and trafficking reachable from every profile, request, chat and the footer, without an account. Urgent kinds first; a logged "passed to police" outcome. Recognised support organisations get a marked account that can contact creators. | `server/reports.ts`, `app/report`, back office Review queue, account page |
| Meetings and payments off platform | Forbidden in the terms and creator agreement; a warning on the sender's device before encryption; report link in every chat. | `deals/[id]/room.tsx` |
| Right of withdrawal (consumer law for digital content) | Accepting needs a separate checkbox: start now and lose the 14 day withdrawal right once delivered. Stored with the deal and in the audit log with the exact text. | `WAIVER_TEXT`, `acceptOffer` |
| Fair terms | A lost dispute flags an account for review; nothing is closed automatically. | `domain/rules.ts` flag effects |
| VAT (art. 9a Implementing Regulation 282/2011, CJEU C-695/20 Fenix) | ByRequest is treated as the supplier: VAT on deal value plus fee at the buyer's country rate, shown in the price, booked as `vat_payable`, refunded in full. | `quote()`, `VAT_RATES` |
| DAC7 | Creators give tax details (sealed) before payouts. Yearly admin export per seller with consideration and fees per quarter. | `/tax`, `api/admin/dac7` |
| DSA notices, reasons and appeals (art. 16, 17, 20, 22) | Notice form; a statement of reasons for every restriction, block, content rejection and age closure; appeal in the app and from a closed account after the email code; trusted flaggers first. | `server/decisions.ts`, `/decisions/[id]`, sign in |
| DSA point of contact and transparency (art. 11, 12, 15) | Contact page; yearly figures in the back office audit log. | `/legal/contact`, `transparency()` |
| GDPR art. 9 | Explicit consent at sign up, asked once from existing accounts. | sign up, `ConsentGate` |
| GDPR rights and storage limitation | Download your data, delete your account (bookkeeping kept), scheduled purge of old chats, notifications, report contacts and login codes. | `server/privacy.ts`, cron |
| Non consensual intimate images | Removed files are fingerprinted (exact and perceptual hash) and cannot be uploaded again. StopNCII is pointed to from the report form. | `server/media.ts` blockFile |
| Worn items | Category off: shipping exposes addresses. | `ENABLED_CATEGORIES` |

## 12. Open decisions (not to be assumed)

| # | Decision | Owner |
|---|---|---|
| 14 | Whether ByRequest falls under the Belgian advertising rules for sexual services at all, and which further measures the royal decree requires | Belgian counsel |
| 15 | Deemed supplier VAT treatment, OSS registration, rates and invoicing | Accountant |
| 16 | DAC7 registration and filing format in Belgium and the Netherlands | Accountant |
| 17 | DPIA sign off, data protection officer, processor agreements with every provider | Privacy counsel |
| 18 | Which age assurance method the regulators and payment partner accept for buyers | Payment partner, counsel |
| 19 | Whether municipal sex work rules in the Netherlands touch the platform | Dutch counsel |
| 20 | Marketing rules: no targeting of students or anyone who may be under 18 | Founders, counsel |

### Earlier open decisions

| # | Decision | Owner |
|---|---|---|
| 1 | Which payment partner accepts the model, on which terms, in which countries | Payment partners |
| 2 | Whether funds are held by authorisation and delayed capture, a provider hold or split product, and the maximum hold period | Payment partner |
| 3 | Which identity verification provider the payment partner accepts, and whether one verification may be reused across providers | Payment partner, identity provider |
| 4 | Exact payout and onboarding fields per country, account type and provider, including tax and business data, and when address or proof of address is needed | Payment partner |
| 5 | Which combination of automated and human review is sufficient before availability, and review time limits | Payment partner, written agreement |
| 6 | Participant verification and consent requirements, and the consent text | Payment partner, legal counsel |
| 7 | Final texts of Terms, Privacy statement, Creator agreement and Consent to appear | Legal counsel, payment partner review |
| 8 | Retention periods per data type and statutory retention | Legal counsel |
| 9 | Reverification triggers and expiry of identity results | Identity provider, payment partner |
| 10 | Handling of appeals against provider rejections | Provider process |
| 11 | Country specific legal limits, for example Ireland, Norway and Sweden | Legal counsel |
| 12 | Forensic watermark vendor and tested robustness | Product, vendor |
| 13 | Multi device chat key management | Product, security review |
