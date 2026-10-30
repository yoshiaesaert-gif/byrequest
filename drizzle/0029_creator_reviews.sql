CREATE TABLE IF NOT EXISTS "creator_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"stars" integer NOT NULL,
	"quote" text NOT NULL DEFAULT '',
	"may_publish" boolean NOT NULL DEFAULT false,
	"status" text NOT NULL DEFAULT 'pending',
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"decided_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "creator_reviews_user" ON "creator_reviews" ("user_id");
