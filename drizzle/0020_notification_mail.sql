ALTER TABLE "notifications" ADD COLUMN "mailed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_mailed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "notifications" SET "mailed_at" = now() WHERE "created_at" < now() - interval '24 hours' OR "read_at" IS NOT NULL;
