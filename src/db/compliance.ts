import { pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users, deals } from "./schema";

/* Compliance data, kept apart from the public profile. Nothing in this file is ever returned
   by a public endpoint. We store provider references and results, not ID scans or biometrics. */

export const checkStatus = pgEnum("check_status", ["not_started", "pending", "action_required", "approved", "rejected", "expired"]);
export const restriction = pgEnum("restriction", ["none", "restricted", "suspended"]);
export const providerEnv = pgEnum("provider_env", ["test", "live"]);
export const reviewStatus = pgEnum("review_status", ["pending_review", "approved", "rejected", "blocked_participants"]);
export const staffRole = pgEnum("staff_role", ["none", "support", "admin"]);

/* One row per creator. Area statuses are the source of truth for access rules. */
export const onboarding = pgTable("creator_onboarding", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  email: checkStatus("email").notNull().default("not_started"),
  identity: checkStatus("identity").notNull().default("not_started"),
  payout: checkStatus("payout").notNull().default("not_started"),
  agreement: checkStatus("agreement").notNull().default("not_started"),
  restriction: restriction("restriction").notNull().default("none"),
  restrictionReason: text("restriction_reason"),
  accountType: text("account_type").$type<"individual" | "business">(),
  country: text("country"),                   // ISO 3166 alpha 2, chosen for payouts
  lastStep: text("last_step").$type<"account" | "identity" | "payouts" | "agreement" | "done">().notNull().default("account"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Identity verification at a provider. Only the outcome and a reference are stored. */
export const identityChecks = pgTable("identity_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),     // null for a participant without an account
  participantId: uuid("participant_id"),
  provider: text("provider").notNull(),
  env: providerEnv("env").notNull(),
  externalRef: text("external_ref").notNull(),
  status: checkStatus("status").notNull().default("pending"),
  over18: boolean("over_18"),
  documentChecked: boolean("document_checked"),
  livenessChecked: boolean("liveness_checked"),
  missing: jsonb("missing").$type<string[]>().notNull().default([]),
  reason: text("reason"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastEventAt: timestamp("last_event_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("identity_ref").on(t.provider, t.externalRef), index("identity_user").on(t.userId)]);

/* Legal identity as returned by the verification provider, encrypted with an application key.
   Read only through confidential.ts, which writes an access log entry for every read. */
export const confidentialIdentity = pgTable("confidential_identity", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  sealed: text("sealed").notNull(),           // AES-256-GCM of { legalName, dateOfBirth, country }
  source: text("source").notNull(),           // provider name
  retainUntil: timestamp("retain_until", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Payout onboarding per provider. A creator can be approved at provider A and still need steps at B. */
export const payoutAccounts = pgTable("payout_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  env: providerEnv("env").notNull(),
  externalRef: text("external_ref").notNull(),
  accountType: text("account_type").$type<"individual" | "business">().notNull(),
  country: text("country").notNull(),
  status: checkStatus("status").notNull().default("pending"),
  canReceivePayouts: boolean("can_receive_payouts").notNull().default(false),
  canProcessSales: boolean("can_process_sales").notNull().default(false),
  missing: jsonb("missing").$type<string[]>().notNull().default([]),
  actionUrl: text("action_url"),              // an external step the creator must complete at the provider
  reason: text("reason"),
  lastEventAt: timestamp("last_event_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("payout_ref").on(t.provider, t.externalRef), uniqueIndex("payout_user_provider").on(t.userId, t.provider)]);

export type DocKind = "terms" | "privacy" | "creator_agreement" | "participant_consent";

/* Versioned legal documents. The hash is the integrity reference of the exact text accepted. */
export const documents = pgTable("legal_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<DocKind>().notNull(),
  version: text("version").notNull(),
  title: text("title").notNull(),
  summary: jsonb("summary").$type<string[]>().notNull().default([]),
  body: text("body").notNull(),
  sha256: text("sha256").notNull(),
  status: text("status").$type<"draft_pending_review" | "approved">().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  current: boolean("current").notNull().default(true),
}, (t) => [uniqueIndex("doc_version").on(t.kind, t.version)]);

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  kind: text("kind").notNull(),
  version: text("version").notNull(),
  sha256: text("sha256").notNull(),
  method: text("method").$type<"checkbox_and_button" | "acknowledged_link">().notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("consent_user").on(t.userId, t.kind)]);

/* Signed provider events. The unique key makes duplicate deliveries a no-op. */
export const providerEvents = pgTable("provider_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  type: text("type").notNull(),
  externalRef: text("external_ref").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  outcome: text("outcome").$type<"applied" | "stale" | "unknown_ref">(),
}, (t) => [uniqueIndex("provider_event_once").on(t.provider, t.eventId)]);

export const audit = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actor: text("actor").notNull(),             // user:<id>, staff:<id>, provider:<name>, system
  action: text("action").notNull(),
  subjectUserId: uuid("subject_user_id"),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_subject").on(t.subjectUserId, t.at)]);

export const staff = pgTable("staff", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  role: staffRole("role").notNull().default("support"),
});

/* People who appear in content besides the creator. Each one verifies through the identity
   provider with an invite link (no account needed) and gives consent per delivery. */
export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),              // private label for the creator, never shown to buyers
  inviteTokenHash: text("invite_token_hash").notNull(),
  identity: checkStatus("identity").notNull().default("not_started"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const participantConsents = pgTable("participant_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  deliveryId: uuid("delivery_id").notNull(),
  depicted: boolean("depicted").notNull(),
  distribution: boolean("distribution").notNull(),   // this specific availability: the buyer's private vault
  extraRights: jsonb("extra_rights").$type<string[]>().notNull().default([]),
  documentId: uuid("document_id").references(() => documents.id),
  givenAt: timestamp("given_at", { withTimezone: true }).notNull().defaultNow(),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
}, (t) => [uniqueIndex("participant_delivery").on(t.participantId, t.deliveryId)]);

/* A delivery passes three separate gates: technical check, content review, participants. */
export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  creatorId: uuid("creator_id").notNull().references(() => users.id),
  mediaIds: jsonb("media_ids").$type<string[]>().notNull(),
  technical: jsonb("technical").$type<{ ok: boolean; text: string }[]>().notNull(),
  onlyCreator: boolean("only_creator").notNull(),
  participantIds: jsonb("participant_ids").$type<string[]>().notNull().default([]),
  review: reviewStatus("review").notNull().default("pending_review"),
  reviewedBy: text("reviewed_by"),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("deliveries_review").on(t.review, t.createdAt)]);

/* Removal requests from anyone, including people without an account. */
export const removalRequests = pgTable("removal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactSealed: text("contact_sealed").notNull(),
  reference: text("reference").notNull(),
  description: text("description").notNull(),
  status: text("status").$type<"received" | "content_hidden" | "resolved" | "rejected">().notNull().default("received"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appeals = pgTable("appeals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  area: text("area").$type<"identity" | "payout" | "restriction" | "content">().notNull(),
  message: text("message").notNull(),
  status: text("status").$type<"open" | "answered">().notNull().default("open"),
  answer: text("answer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

