ALTER TABLE "tech_issues" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'problem';
ALTER TABLE "tech_issues" ADD COLUMN IF NOT EXISTS "topic" text;
ALTER TABLE "tech_issues" ADD COLUMN IF NOT EXISTS "contact" text;
