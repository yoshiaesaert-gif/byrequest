ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_fingerprint" text;
CREATE INDEX IF NOT EXISTS "users_id_fingerprint" ON "users" ("id_fingerprint");
