# ByRequest

A request first marketplace for personal content between verified adults. A buyer posts a request with a budget, creators choose freely whether to make an offer, the buyer picks one, the payment partner secures the money, the creator delivers, the delivery is checked and reviewed, it lands in the buyer's private vault, and after a 24 hour objection window the creator is paid.

## Run it locally

1. Postgres 16 and ffmpeg must be installed. Start Postgres and create a database:
   `createdb byrequest` (the default `.env` expects user `brq`, password `brq`).
2. `cp .env.example .env` and adjust.
3. `npm install`
4. `npm run db:migrate` then `npm run db:seed` (demo data; wipes the database).
5. `npm run dev` and open http://localhost:3000
6. Optional: `npm run worker` releases payments after the objection window and refunds missed deadlines once a minute.

With `DEV_SHOW_CODE=1` the sign in page shows the email code on screen and offers demo accounts:

| Account | Role |
|---|---|
| nightowl | buyer with an open request, four offers and a vault |
| milo | approved creator (test environment) |
| noah | creator whose payout setup still needs a step, to show the gates |
| ops | support and admin, review queue at /admin |

## Checks

| Command | What it does |
|---|---|
| `npm test` | unit tests for the rules and integration tests against `byrequest_test` |
| `npm run typecheck` | route types plus TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | production build |

## How it is built

Next.js 16 (App Router, server actions), React 19, TypeScript, Postgres with Drizzle ORM, sharp and ffmpeg for media, tweetnacl for chat encryption. The design system is the prototype's, in `src/app/globals.css` plus `src/app/app.css`.

| Path | Purpose |
|---|---|
| `src/domain/rules.ts` | money split, escrow state machine, technical delivery check (pure, tested) |
| `src/domain/creator.ts` | creator statuses and capabilities (pure, tested) |
| `src/db/schema.ts` | marketplace tables |
| `src/db/compliance.ts` | onboarding, verification, payout, consent, participant, review and audit tables |
| `src/server/deals.ts` | offers, deals, delivery, review, release, disputes, payout hold |
| `src/server/onboarding.ts` | creator onboarding, webhook processing, access rules |
| `src/server/providers.ts` | provider adapters and the test provider |
| `src/server/participants.ts` | other people in content: verification, consent, removal |
| `src/server/admin.ts` | support tooling |
| `src/config/compliance.ts` | providers, countries, fields, review mode, retention |
| `src/legal/documents.ts` | versioned legal drafts |
| `docs/COMPLIANCE.md` | the compliance design and every open decision |

## Privacy by design

1. Other users only ever receive the public profile shape (`publicProfile` in `src/server/queries.ts`).
2. Chats are end to end encrypted in the browser; the server stores ciphertext.
3. Vault files are served only to their buyer, inline, uncached, with the buyer's name burned into images per view.
4. Payments show as BRQ DIGITAL. Notifications can be fully neutral. Quick hide covers the screen with a shopping list.
