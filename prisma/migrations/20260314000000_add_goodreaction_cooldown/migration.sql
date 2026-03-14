-- Migration: add cooldown fields to Goodreactions
BEGIN;

-- Add columns if they don't already exist
ALTER TABLE "Goodreactions"
  ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true NOT NULL;

ALTER TABLE "Goodreactions"
  ADD COLUMN IF NOT EXISTS "counted" boolean DEFAULT true NOT NULL;

ALTER TABLE "Goodreactions"
  ADD COLUMN IF NOT EXISTS "lastCountedEventTs" varchar(255);

-- Backfill lastCountedEventTs from existing eventTs when missing
UPDATE "Goodreactions"
  SET "lastCountedEventTs" = "eventTs"
  WHERE "lastCountedEventTs" IS NULL
    AND "eventTs" IS NOT NULL;

COMMIT;
