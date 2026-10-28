ALTER TYPE "public"."request_status" ADD VALUE 'in_review';--> statement-breakpoint
ALTER TYPE "public"."request_status" ADD VALUE 'rejected';--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "check_verdict" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "check_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "staff_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;