CREATE TYPE "public"."album_status" AS ENUM('requested', 'declined', 'in_review', 'ready', 'opened', 'gone');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('video', 'photos', 'voice', 'custom', 'worn');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('held', 'reviewing', 'delivered', 'disputed', 'released', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."dispute_outcome" AS ENUM('open', 'upheld', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."face_rule" AS ENUM('not_needed', 'optional', 'required');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('pending', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."profile_visibility" AS ENUM('offer_only', 'public');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('open', 'matched', 'closed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."vault_period" AS ENUM('7d', '30d', '1y', 'forever');--> statement-breakpoint
CREATE TYPE "public"."check_status" AS ENUM('not_started', 'pending', 'action_required', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."provider_env" AS ENUM('test', 'live');--> statement-breakpoint
CREATE TYPE "public"."restriction" AS ENUM('none', 'restricted', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending_review', 'approved', 'rejected', 'blocked_participants');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('none', 'support', 'admin');--> statement-breakpoint
CREATE TABLE "creator_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"visibility" "profile_visibility" DEFAULT 'offer_only' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"height_cm" integer,
	"build" text,
	"sport" text,
	"work" text,
	"languages" text,
	"hair" text,
	"eyes" text,
	"body" text,
	"tattoos" text,
	"makes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"never" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shows_face" boolean DEFAULT false NOT NULL,
	"default_vault" "vault_period" DEFAULT '30d' NOT NULL,
	"from_cents" integer DEFAULT 3000 NOT NULL,
	"reply_minutes" integer DEFAULT 60 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"deal_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"creator_cents" integer NOT NULL,
	"payment_ref" text NOT NULL,
	"status" "deal_status" DEFAULT 'held' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"delivered_at" timestamp with time zone,
	"object_until" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"buyer_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"outcome" "dispute_outcome" DEFAULT 'open' NOT NULL,
	"decided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"user_id" uuid,
	"entry" text NOT NULL,
	"cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_codes" (
	"email" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"duration_sec" integer,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"sender_id" uuid,
	"kind" text NOT NULL,
	"nonce" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"shows_face" boolean NOT NULL,
	"vault" "vault_period" NOT NULL,
	"eta_hours" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "offer_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preview_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" "album_status" DEFAULT 'requested' NOT NULL,
	"media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"title" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"category" "category" NOT NULL,
	"amount" integer NOT NULL,
	"deal_cents" integer NOT NULL,
	"who" text NOT NULL,
	"age_min" integer NOT NULL,
	"age_max" integer NOT NULL,
	"face" "face_rule" DEFAULT 'not_needed' NOT NULL,
	"min_vault" "vault_period" DEFAULT '30d' NOT NULL,
	"due_hours" integer DEFAULT 48 NOT NULL,
	"cover" text,
	"status" "request_status" DEFAULT 'open' NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saves" (
	"user_id" uuid NOT NULL,
	"request_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"step_up_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"handle" text NOT NULL,
	"birth_year" integer NOT NULL,
	"is_creator" boolean DEFAULT false NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp with time zone,
	"ban_reason" text,
	"avatar" jsonb,
	"public_key" text,
	"prefs" jsonb DEFAULT '{"frost":true,"discreetPush":true,"neutralTab":false}'::jsonb NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"delivery_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"available_until" timestamp with time zone,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"area" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"answer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"subject_user_id" uuid,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confidential_identity" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sealed" text NOT NULL,
	"source" text NOT NULL,
	"retain_until" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"sha256" text NOT NULL,
	"method" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"media_ids" jsonb NOT NULL,
	"technical" jsonb NOT NULL,
	"only_creator" boolean NOT NULL,
	"participant_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review" "review_status" DEFAULT 'pending_review' NOT NULL,
	"reviewed_by" text,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"title" text NOT NULL,
	"summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body" text NOT NULL,
	"sha256" text NOT NULL,
	"status" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"participant_id" uuid,
	"provider" text NOT NULL,
	"env" "provider_env" NOT NULL,
	"external_ref" text NOT NULL,
	"status" "check_status" DEFAULT 'pending' NOT NULL,
	"over_18" boolean,
	"document_checked" boolean,
	"liveness_checked" boolean,
	"missing" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text,
	"expires_at" timestamp with time zone,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_onboarding" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" "check_status" DEFAULT 'not_started' NOT NULL,
	"identity" "check_status" DEFAULT 'not_started' NOT NULL,
	"payout" "check_status" DEFAULT 'not_started' NOT NULL,
	"agreement" "check_status" DEFAULT 'not_started' NOT NULL,
	"restriction" "restriction" DEFAULT 'none' NOT NULL,
	"restriction_reason" text,
	"account_type" text,
	"country" text,
	"last_step" text DEFAULT 'account' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"depicted" boolean NOT NULL,
	"distribution" boolean NOT NULL,
	"extra_rights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"document_id" uuid,
	"given_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"label" text NOT NULL,
	"invite_token_hash" text NOT NULL,
	"identity" "check_status" DEFAULT 'not_started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"env" "provider_env" NOT NULL,
	"external_ref" text NOT NULL,
	"account_type" text NOT NULL,
	"country" text NOT NULL,
	"status" "check_status" DEFAULT 'pending' NOT NULL,
	"can_receive_payouts" boolean DEFAULT false NOT NULL,
	"can_process_sales" boolean DEFAULT false NOT NULL,
	"missing" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"action_url" text,
	"reason" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"external_ref" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text
);
--> statement-breakpoint
CREATE TABLE "removal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_sealed" text NOT NULL,
	"reference" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" "staff_role" DEFAULT 'support' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_albums" ADD CONSTRAINT "preview_albums_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_albums" ADD CONSTRAINT "preview_albums_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_albums" ADD CONSTRAINT "preview_albums_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confidential_identity" ADD CONSTRAINT "confidential_identity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_checks" ADD CONSTRAINT "identity_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_onboarding" ADD CONSTRAINT "creator_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_consents" ADD CONSTRAINT "participant_consents_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_consents" ADD CONSTRAINT "participant_consents_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deals_due" ON "deals" USING btree ("status","object_until");--> statement-breakpoint
CREATE INDEX "messages_deal" ON "messages" USING btree ("deal_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_one_per_creator" ON "offers" USING btree ("request_id","creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "album_one_per_offer" ON "preview_albums" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "requests_status" ON "requests" USING btree ("status","closes_at");--> statement-breakpoint
CREATE UNIQUE INDEX "saves_pk" ON "saves" USING btree ("user_id","request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle" ON "users" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "vault_buyer" ON "vault_items" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "audit_subject" ON "audit_log" USING btree ("subject_user_id","at");--> statement-breakpoint
CREATE INDEX "consent_user" ON "consents" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "deliveries_review" ON "deliveries" USING btree ("review","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_version" ON "legal_documents" USING btree ("kind","version");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_ref" ON "identity_checks" USING btree ("provider","external_ref");--> statement-breakpoint
CREATE INDEX "identity_user" ON "identity_checks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_delivery" ON "participant_consents" USING btree ("participant_id","delivery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_ref" ON "payout_accounts" USING btree ("provider","external_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_user_provider" ON "payout_accounts" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_event_once" ON "provider_events" USING btree ("provider","event_id");