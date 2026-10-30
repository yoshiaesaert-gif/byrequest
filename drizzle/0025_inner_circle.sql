ALTER TABLE "requests" ADD COLUMN "for_creator_id" uuid REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "circle_first" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "circle_until" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "circle" (
	"buyer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"creator_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("buyer_id", "creator_id")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "circle_creator" ON "circle" ("creator_id");
