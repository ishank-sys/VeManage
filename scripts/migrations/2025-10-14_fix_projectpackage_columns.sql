-- Fix ProjectPackage missing columns and PostgREST schema cache
-- Run this in Supabase SQL editor

-- 1) Add IFA/IFC version columns if they don't exist
ALTER TABLE "ProjectPackage"
  ADD COLUMN IF NOT EXISTS ifaversion text,
  ADD COLUMN IF NOT EXISTS ifcversion text;

-- 2) Add updatedAt column if a trigger expects it (avoids: record "new" has no field "updatedAt")
ALTER TABLE "ProjectPackage"
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT now();

-- 3) Optionally backfill updatedAt from existing updatedat column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ProjectPackage'
      AND column_name = 'updatedat'
  ) THEN
    EXECUTE 'UPDATE "ProjectPackage" SET "updatedAt" = COALESCE("updatedat"::timestamptz, now()) WHERE "updatedAt" IS NULL;';
  END IF;
END $$;

-- 4) Ask PostgREST to reload schema cache so new columns are visible immediately
-- This requires appropriate permissions; run separately if it errors in your project
DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); EXCEPTION WHEN others THEN END $$;
