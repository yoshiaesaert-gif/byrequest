CREATE TABLE IF NOT EXISTS "help_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE set null,
	"stars" integer NOT NULL,
	"comment" text,
	"role" text,
	"filed" boolean NOT NULL DEFAULT false,
	"turns" integer NOT NULL DEFAULT 0,
	"conversation" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "help_ratings_at" ON "help_ratings" ("created_at");
