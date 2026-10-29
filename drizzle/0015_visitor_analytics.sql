CREATE TABLE "visit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"path" text NOT NULL,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" uuid,
	"ip" text,
	"country" text,
	"city" text,
	"device" text,
	"browser" text,
	"os" text,
	"lang" text,
	"referrer" text,
	"utm" jsonb,
	"ref_code" text,
	"landing" text NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visit_events" ADD CONSTRAINT "visit_events_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visit_events_visit" ON "visit_events" USING btree ("visit_id","at");--> statement-breakpoint
CREATE INDEX "visit_events_at" ON "visit_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "visits_started" ON "visits" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "visits_visitor" ON "visits" USING btree ("visitor_id");