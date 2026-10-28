ALTER TABLE "deals" ADD COLUMN "creator_rating" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "buyer_rating_sum" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "buyer_rating_count" integer DEFAULT 0 NOT NULL;