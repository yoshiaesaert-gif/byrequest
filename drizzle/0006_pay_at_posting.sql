ALTER TABLE "ledger" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "pay_ref" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "pay_total_cents" integer;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "pay_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "pay_vat_cents" integer;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "pay_vat_rate" integer;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "refunded_at" timestamp with time zone;