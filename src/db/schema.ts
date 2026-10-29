import {
  pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, uuid, uniqueIndex, index,
} from "drizzle-orm/pg-core";

/* Money is always stored in euro cents. "Deal value" is the creator price the buyer agreed to.
   The buyer pays deal value plus a 10% service fee; the creator earns 80% of deal value. */

export const category = pgEnum("category", ["video", "photos", "voice", "custom", "worn"]);
export const faceRule = pgEnum("face_rule", ["not_needed", "optional", "required"]);
export const vaultPeriod = pgEnum("vault_period", ["7d", "30d", "1y", "forever"]);
export const requestStatus = pgEnum("request_status", ["open", "matched", "closed", "expired", "in_review", "rejected"]);
export const offerStatus = pgEnum("offer_status", ["pending", "accepted", "declined", "withdrawn"]);
export const dealStatus = pgEnum("deal_status", [
  "held",        // buyer payment secured at the payment provider, creator is making it
  "reviewing",   // passed the technical check, waiting for content review and participant consent
  "delivered",   // passed the technical check, in the vault, objection window running
  "disputed",    // buyer objected inside the window, money still held
  "released",    // creator paid
  "refunded",    // buyer refunded (late delivery or upheld dispute)
]);
export const disputeOutcome = pgEnum("dispute_outcome", ["open", "upheld", "rejected"]);
export const albumStatus = pgEnum("album_status", ["requested", "declined", "in_review", "ready", "opened", "gone"]);
export const profileVisibility = pgEnum("profile_visibility", ["offer_only", "public"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  handle: text("handle").notNull(),
  birthYear: integer("birth_year").notNull(),
  isCreator: boolean("is_creator").notNull().default(false),   // started creator onboarding; access comes from creator_onboarding
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  banReason: text("ban_reason"),
  avatar: jsonb("avatar").$type<{ kind: "3d"; look: string } | { kind: "built"; spec: Record<string, unknown>; svg?: string } | { kind: "photo"; blur: boolean }>(),
  publicKey: text("public_key"),          // NaCl box public key, base64. The secret key never leaves the device.
  prefs: jsonb("prefs").$type<Prefs>().notNull().default({ frost: true, discreetPush: true, neutralTab: false }),
  ratingSum: integer("rating_sum").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  buyerRatingSum: integer("buyer_rating_sum").notNull().default(0),   // stars this person got as a buyer
  buyerRatingCount: integer("buyer_rating_count").notNull().default(0),
  country: text("country").notNull().default("BE"),                 // for VAT and tax reporting, ISO 3166 alpha 2
  ageVerifiedAt: timestamp("age_verified_at", { withTimezone: true }), // buyer age check passed at the provider
  sensitiveConsentAt: timestamp("sensitive_consent_at", { withTimezone: true }), // explicit consent, GDPR art. 9
  supportOrg: text("support_org"),
  house: boolean("house").notNull().default(false),                  // a ByRequest team profile: real budget, labelled "by ByRequest"                                    // name of a recognised support organisation, set by staff
  internal: boolean("internal").notNull().default(false),        // created by the ByRequest team (tests, demo, staff); new sign ups are external
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  refCode: text("ref_code"),                                         // personal invite code, made on first visit to /invite
  freeFees: integer("free_fees").notNull().default(0),               // service fees ByRequest pays for this buyer (referral gift)
  lang: text("lang").notNull().default("nl"),                        // language for emails, follows the language switch
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),      // for the "we miss you" email only, updated at most every few hours
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_email").on(t.email), uniqueIndex("users_handle").on(t.handle), uniqueIndex("users_ref_code").on(t.refCode)]);

export type Prefs = { frost: boolean; discreetPush: boolean; neutralTab: boolean; mailOff?: boolean };   // mailOff: no tips or reminder emails

export const creatorProfiles = pgTable("creator_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  visibility: profileVisibility("visibility").notNull().default("offer_only"),
  bio: text("bio").notNull().default(""),
  heightCm: integer("height_cm"),
  build: text("build"),
  sport: text("sport"),
  work: text("work"),
  languages: text("languages"),
  hair: text("hair"),
  eyes: text("eyes"),
  body: text("body"),
  tattoos: text("tattoos"),
  detail: jsonb("detail").$type<import("@/domain/looks-detail").Detail>().notNull().default({}),   // gender shown; intimate details only to buyers they applied to
  makes: jsonb("makes").$type<string[]>().notNull().default([]),
  never: jsonb("never").$type<string[]>().notNull().default([]),
  showsFace: boolean("shows_face").notNull().default(false),
  defaultVault: vaultPeriod("default_vault").notNull().default("30d"),
  fromCents: integer("from_cents").notNull().default(3000),
  replyMinutes: integer("reply_minutes").notNull().default(60),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  stepUpAt: timestamp("step_up_at", { withTimezone: true }),   // last fresh email code, for sensitive changes
});

export const loginCodes = pgTable("login_codes", {
  email: text("email").primaryKey(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const requests = pgTable("requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  details: text("details").notNull().default(""),
  callMe: text("call_me"),                                   // how the creator should address the buyer; shown only inside the deal
  category: category("category").notNull(),
  amount: integer("amount").notNull(),            // minutes for video/voice/custom, count for photos/worn
  dealCents: integer("deal_cents").notNull(),
  who: text("who").notNull(),                     // Man, Woman, Anyone
  ageMin: integer("age_min").notNull(),
  ageMax: integer("age_max").notNull(),
  face: faceRule("face").notNull().default("not_needed"),
  minVault: vaultPeriod("min_vault").notNull().default("30d"),
  dueHours: integer("due_hours").notNull().default(48),
  cover: text("cover"),                           // cover photo key, null means neutral cover
  lang: text("lang").notNull().default("en"),      // language the buyer wrote in: nl, fr or en
  status: requestStatus("status").notNull().default("open"),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  // Moderation: new requests wait in review; the automatic check is a suggestion for staff, never the decision.
  checkVerdict: text("check_verdict"),                          // approve, check or reject
  checkFlags: jsonb("check_flags").$type<{ code: string; level: "block" | "warn" | "info"; label: string; match?: string }[]>().notNull().default([]),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  staffEditedAt: timestamp("staff_edited_at", { withTimezone: true }),   // set when staff edit a request; scripts then leave it alone
  // Paid when posted: the payment partner holds the money from posting until delivery, or refunds it.
  payRef: text("pay_ref"),
  payTotalCents: integer("pay_total_cents"),
  payFeeCents: integer("pay_fee_cents"),
  feeGiftCents: integer("fee_gift_cents").notNull().default(0),      // service fee paid by ByRequest (referral gift); given back if refunded
  creditCents: integer("credit_cents").notNull().default(0),         // part paid from the bonus balance; goes back to the balance on a refund
  payVatCents: integer("pay_vat_cents"),
  payVatRate: integer("pay_vat_rate"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("requests_status").on(t.status, t.closesAt)]);

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
  creatorId: uuid("creator_id").notNull().references(() => users.id),
  showsFace: boolean("shows_face").notNull(),
  vault: vaultPeriod("vault").notNull(),
  etaHours: integer("eta_hours").notNull(),
  note: text("note").notNull().default(""),
  status: offerStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("offers_one_per_creator").on(t.requestId, t.creatorId)]);

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").notNull().references(() => requests.id),
  offerId: uuid("offer_id").notNull().references(() => offers.id),
  buyerId: uuid("buyer_id").notNull().references(() => users.id),
  creatorId: uuid("creator_id").notNull().references(() => users.id),
  dealCents: integer("deal_cents").notNull(),
  feeCents: integer("fee_cents").notNull(),
  creatorCents: integer("creator_cents").notNull(),
  vatCents: integer("vat_cents").notNull().default(0),
  vatRate: integer("vat_rate_bp").notNull().default(0),              // basis points, 2100 = 21%
  withdrawalWaivedAt: timestamp("withdrawal_waived_at", { withTimezone: true }),
  paymentRef: text("payment_ref").notNull(),
  status: dealStatus("status").notNull().default("held"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  objectUntil: timestamp("object_until", { withTimezone: true }),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  buyerRating: integer("buyer_rating"),
  buyerReadAt: timestamp("buyer_read_at", { withTimezone: true }),     // last time each side had the chat open: read ticks and unread counts
  creatorReadAt: timestamp("creator_read_at", { withTimezone: true }),
  reviewText: text("review_text"),
  creatorRating: integer("creator_rating"),          // the creator rates the buyer, stars
  buyerScores: jsonb("buyer_scores").$type<{ quality: number; asAgreed: boolean; onTime: boolean; communication: number; overDelivered: boolean }>(),
  creatorScores: jsonb("creator_scores").$type<{ clear: boolean; respectful: boolean; again: boolean }>(),
  tipCents: integer("tip_cents").notNull().default(0),              // a thank you on top, paid by the buyer after delivery
  tipCreatorCents: integer("tip_creator_cents").notNull().default(0),
  tipVatCents: integer("tip_vat_cents").notNull().default(0),
  tipRef: text("tip_ref"),
  tipAt: timestamp("tip_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("deals_due").on(t.status, t.objectUntil)]);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  storageKey: text("storage_key").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  durationSec: integer("duration_sec"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vaultItems = pgTable("vault_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  buyerId: uuid("buyer_id").notNull().references(() => users.id),
  mediaId: uuid("media_id").notNull().references(() => media.id),
  deliveryId: uuid("delivery_id"),
  position: integer("position").notNull().default(0),
  availableUntil: timestamp("available_until", { withTimezone: true }), // null = forever
  views: integer("views").notNull().default(0),
}, (t) => [index("vault_buyer").on(t.buyerId)]);

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  reason: text("reason").notNull(),
  note: text("note").notNull().default(""),
  outcome: disputeOutcome("outcome").notNull().default("open"),
  decidedBy: text("decided_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

/* Chat messages are end to end encrypted with NaCl box between buyer and creator.
   The server only stores nonce and ciphertext. System messages (kind=system) are plain and written by the server. */
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id),
  kind: text("kind").$type<"e2e" | "system">().notNull(),
  nonce: text("nonce"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("messages_deal").on(t.dealId, t.createdAt)]);

export const previewAlbums = pgTable("preview_albums", {
  id: uuid("id").primaryKey().defaultRandom(),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  buyerId: uuid("buyer_id").notNull().references(() => users.id),
  creatorId: uuid("creator_id").notNull().references(() => users.id),
  kind: text("kind").$type<"looks" | "body" | "intimate">().notNull(),
  status: albumStatus("status").notNull().default("requested"),
  mediaIds: jsonb("media_ids").$type<string[]>().notNull().default([]),
  views: jsonb("views").$type<Record<string, string>>().notNull().default({}),   // photo index -> first time it was shown; each photo shows once
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("album_one_per_offer").on(t.offerId)]);

/* The creator's own hidden preview album: a few photos they choose, each reviewed before it can be
   shared. Never public, never in a feed. Shared only with a buyer who asked, while they choose. */
export const previewPhotos = pgTable("preview_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"looks" | "body" | "intimate">().notNull(),
  status: text("status").$type<"in_review" | "approved" | "rejected">().notNull().default("in_review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("preview_photos_creator").on(t.creatorId, t.createdAt)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("notifications_user").on(t.userId, t.createdAt)]);

export const saves = pgTable("saves", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestId: uuid("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("saves_pk").on(t.userId, t.requestId)]);

/* One person blocks another. Works both ways once it exists: no applications, no new deals, no chat,
   and neither sees the other's requests or profile. Silent: the blocked person is never told. */
export const blocks = pgTable("blocks", {
  blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  anonymous: boolean("anonymous").notNull().default(false),   // blocked from a request: the buyer's name is never shown to the blocker
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("blocks_pk").on(t.blockerId, t.blockedId), index("blocks_blocked").on(t.blockedId)]);

/* Referral programme. One row per invited person, from sign up on. The person who invited earns
   10% of what an invited creator nets in their first 30 days (counted from their first paid deal),
   paid by ByRequest on top, never taken from the friend. An invited buyer gets their first service fee
   paid by ByRequest, and the person who invited gets one too once that first deal is paid out. */
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: uuid("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refereeId: uuid("referee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  intent: text("intent").$type<"buy" | "earn">().notNull(),
  firstDealAt: timestamp("first_deal_at", { withTimezone: true }),     // invited creator: first paid deal; starts the 30 day window
  windowEndsAt: timestamp("window_ends_at", { withTimezone: true }),
  buyerRewardedAt: timestamp("buyer_rewarded_at", { withTimezone: true }), // invited buyer: first deal paid out, inviter got their gift
  earnedCents: integer("earned_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("referrals_referee").on(t.refereeId), index("referrals_referrer").on(t.referrerId)]);

/* Each reward, tied to the deal that earned it. A deal can earn a reward once. */
export const referralRewards = pgTable("referral_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralId: uuid("referral_id").notNull().references(() => referrals.id, { onDelete: "cascade" }),
  referrerId: uuid("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dealId: uuid("deal_id").references(() => deals.id),
  kind: text("kind").$type<"creator_share" | "free_fee" | "welcome_bonus">().notNull(),   // welcome_bonus: to the invited creator, on their first deal
  cents: integer("cents").notNull().default(0),
  status: text("status").$type<"paid" | "on_hold" | "granted">().notNull(),
  payoutRef: text("payout_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => [uniqueIndex("referral_rewards_deal").on(t.referralId, t.dealId, t.kind), index("referral_rewards_referrer").on(t.referrerId)]);

/* The bonus balance: invite bonuses land here once a week. It can be transferred to the person's own
   payout account or used to pay for a request. Balance = sum of the rows; rows are never changed. */
export const walletEntries = pgTable("wallet_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"week_bonus" | "free_fee" | "welcome_bonus" | "withdrawal" | "spent" | "spent_back">().notNull(),
  cents: integer("cents").notNull(),               // plus adds to the balance, minus takes from it
  weekOf: timestamp("week_of", { withTimezone: true }),
  ref: text("ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("wallet_user").on(t.userId, t.createdAt)]);

/* Every automatic email sent, once per kind per person, so nobody gets the same email twice. */
export const emailLog = pgTable("email_log", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("sent"),               // sent, skipped (mail off) or failed
}, (t) => [uniqueIndex("email_log_pk").on(t.userId, t.kind)]);

/* Audit trail of the programme: link opened, signed up, verified, first deal, reward, payout, gift used. */
export const referralEvents = pgTable("referral_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  referralId: uuid("referral_id").references(() => referrals.id, { onDelete: "set null" }),
  event: text("event").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("referral_events_code").on(t.code, t.createdAt)]);

/* Append only ledger. Every movement of money is one row, so balances can always be rebuilt. */
/* Bookkeeping mirror of what the payment provider did. Funds are held and paid out by the provider;
   ByRequest does not run its own escrow account or wallet. */
export const ledger = pgTable("ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").references(() => deals.id),
  requestId: uuid("request_id"),                  // set for money moved before a deal exists (paid at posting, refunded)
  userId: uuid("user_id").references(() => users.id),
  entry: text("entry").$type<"buyer_charge" | "escrow_hold" | "creator_payout" | "payout_on_hold" | "platform_revenue" | "buyer_refund" | "vat_payable" | "referral_payout" | "referral_on_hold" | "fee_gift" | "tip_charge" | "tip_payout" | "tip_on_hold" | "bonus_credited" | "credit_spent" | "credit_refunded">().notNull(),
  cents: integer("cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Machine translations of user text, made once and reused. Keyed by a hash of the source text. */
export const translations = pgTable("translations", {
  key: text("key").primaryKey(),                  // sha256 of target + source text
  source: text("source").notNull(),
  target: text("target").notNull(),
  text: text("text").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Small key value settings that staff change from the back office, for example the house budget. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Visitor analytics for staff. One row per visit (a tab session that ends after 30 minutes of
   silence), and one row per page view or click inside it. The IP is kept to estimate location. */
export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitorId: text("visitor_id").notNull(),                          // first party cookie, the same browser across visits
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  ip: text("ip"),
  country: text("country"),
  city: text("city"),
  device: text("device"),                                             // mobile, tablet or desktop
  browser: text("browser"),
  os: text("os"),
  lang: text("lang"),
  referrer: text("referrer"),
  utm: jsonb("utm").$type<Record<string, string>>(),
  refCode: text("ref_code"),                                          // came in through an invite link
  landing: text("landing").notNull(),
  pages: integer("pages").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  lastAt: timestamp("last_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("visits_started").on(t.startedAt), index("visits_visitor").on(t.visitorId)]);

export const visitEvents = pgTable("visit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  kind: text("kind").notNull(),                                       // page or click
  path: text("path").notNull(),
  label: text("label"),
}, (t) => [index("visit_events_visit").on(t.visitId, t.at), index("visit_events_at").on(t.at)]);

/* Passkeys (WebAuthn): sign in with Face ID, a fingerprint or the device PIN. Only the public key is
   stored; the private key never leaves the person's device or password manager. */
export const passkeys = pgTable("passkeys", {
  id: text("id").primaryKey(),                                        // credential id, base64url
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull(),                            // base64url
  counter: integer("counter").notNull().default(0),
  transports: jsonb("transports").$type<string[]>(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
}, (t) => [index("passkeys_user").on(t.userId)]);
