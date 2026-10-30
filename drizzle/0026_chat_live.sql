CREATE TABLE IF NOT EXISTS "chat_live" (
	"scope" text NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"seen_at" timestamp with time zone,
	"typing_at" timestamp with time zone,
	PRIMARY KEY ("scope", "user_id")
);
