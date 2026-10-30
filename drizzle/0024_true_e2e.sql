ALTER TABLE "users" DROP COLUMN IF EXISTS "key_box";--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "key_box" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"pub" text NOT NULL,
	"device" text NOT NULL,
	"box" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_links_user" ON "device_links" ("user_id");
