CREATE TABLE IF NOT EXISTS "share_bonuses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "referrer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "cents" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'waiting',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ready_at" timestamp with time zone,
  "decided_at" timestamp with time zone,
  "decided_by" text,
  "note" text
);
CREATE UNIQUE INDEX IF NOT EXISTS "share_bonuses_referee" ON "share_bonuses" ("referee_id");
CREATE INDEX IF NOT EXISTS "share_bonuses_referrer" ON "share_bonuses" ("referrer_id", "created_at");
