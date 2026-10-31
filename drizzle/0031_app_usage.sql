ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "app" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "app_since" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "app_last" timestamp with time zone;
