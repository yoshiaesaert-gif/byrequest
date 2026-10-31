CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"device" text,
	"app" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"last_sent_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint" ON "push_subscriptions" ("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_user" ON "push_subscriptions" ("user_id");
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "pushed_at" timestamp with time zone;
