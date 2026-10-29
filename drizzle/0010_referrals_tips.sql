CREATE TABLE "referral_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"referral_id" uuid,
	"event" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid NOT NULL,
	"referrer_id" uuid NOT NULL,
	"deal_id" uuid,
	"kind" text NOT NULL,
	"cents" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"payout_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"code" text NOT NULL,
	"intent" text NOT NULL,
	"first_deal_at" timestamp with time zone,
	"window_ends_at" timestamp with time zone,
	"buyer_rewarded_at" timestamp with time zone,
	"earned_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "buyer_scores" jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "creator_scores" jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "tip_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "tip_creator_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "tip_vat_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "tip_ref" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "tip_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "fee_gift_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ref_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "free_fees" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referral_events_code" ON "referral_events" USING btree ("code","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_rewards_deal" ON "referral_rewards" USING btree ("referral_id","deal_id","kind");--> statement-breakpoint
CREATE INDEX "referral_rewards_referrer" ON "referral_rewards" USING btree ("referrer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_referee" ON "referrals" USING btree ("referee_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_ref_code" ON "users" USING btree ("ref_code");