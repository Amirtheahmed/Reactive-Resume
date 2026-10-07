-- Fork migration, written to be safe to run again: after an upstream merge it may have to be regenerated
-- under a newer timestamp, and databases that already have the table must pass straight through it.
CREATE TABLE IF NOT EXISTS "information_bank" (
	"user_id" text PRIMARY KEY,
	"data" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'information_bank_user_id_user_id_fkey') THEN
		ALTER TABLE "information_bank" ADD CONSTRAINT "information_bank_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
	END IF;
END $$;
