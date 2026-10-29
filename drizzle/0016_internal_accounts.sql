ALTER TABLE "users" ADD COLUMN "internal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "users" SET "internal" = true;
