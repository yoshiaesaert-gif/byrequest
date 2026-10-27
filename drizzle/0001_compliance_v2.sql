CREATE TABLE "blocked_hashes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sha256" text NOT NULL,
	"dhash" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"ground" text NOT NULL,
	"facts" text NOT NULL,
	"scope" text NOT NULL,
	"automated" boolean DEFAULT false NOT NULL,
	"decided_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"target_type" text DEFAULT 'none' NOT NULL,
	"target_ref" text DEFAULT '' NOT NULL,
	"details" text NOT NULL,
	"contact_sealed" text,
	"reporter_id" uuid,
	"trusted_flagger" text,
	"status" text DEFAULT 'received' NOT NULL,
	"priority" integer DEFAULT 2 NOT NULL,
	"note" text,
	"handled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tax_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"country" text NOT NULL,
	"sealed" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "vat_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "vat_rate_bp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "withdrawal_waived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" text DEFAULT 'BE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "age_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sensitive_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "support_org" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appeals" ADD COLUMN "decision_id" uuid;--> statement-breakpoint
ALTER TABLE "identity_checks" ADD COLUMN "purpose" text DEFAULT 'creator' NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_profiles" ADD CONSTRAINT "tax_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_sha" ON "blocked_hashes" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "decisions_user" ON "decisions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_open" ON "reports" USING btree ("status","priority","created_at");