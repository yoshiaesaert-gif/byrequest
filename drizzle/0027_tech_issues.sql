CREATE TABLE IF NOT EXISTS "tech_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE set null,
	"message" text NOT NULL,
	"page" text NOT NULL DEFAULT '',
	"context" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"status" text NOT NULL DEFAULT 'open',
	"handled_by" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"handled_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "tech_issues_status_idx" ON "tech_issues" ("status", "created_at");
