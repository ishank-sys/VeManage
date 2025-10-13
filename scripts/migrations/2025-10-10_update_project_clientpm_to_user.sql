-- Migration: Ensure Project.clientPm stores User.id (userType = 'Client')
-- Run this in Supabase SQL Editor. Review and adjust quoted identifiers if your tables are unquoted/lowercase.

-- 1) Backup existing values (in case they currently store Client IDs)
ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "clientPm_backup" bigint;

UPDATE "Project"
SET "clientPm_backup" = "clientPm"
WHERE "clientPm" IS NOT NULL
  AND ("clientPm_backup" IS NULL OR "clientPm_backup" <> "clientPm");

-- 2) Drop existing foreign key on Project.clientPm (if any) to avoid conflicts
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'Project'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'clientPm'
  LOOP
    EXECUTE format('ALTER TABLE "Project" DROP CONSTRAINT %I', fk.constraint_name);
  END LOOP;
END $$;

-- 3) Add the intended FK to User(id)
ALTER TABLE "Project"
  ADD CONSTRAINT project_clientpm_fkey
  FOREIGN KEY ("clientPm") REFERENCES "User"(id)
  ON DELETE SET NULL;

-- 4) Optional: add an index to speed up joins/filters
CREATE INDEX IF NOT EXISTS project_clientpm_idx ON "Project"("clientPm");

-- 5) Backfill: map previous clientPm (Client.id) -> User.id where user.userType ~ 'client' and user.clientId matches
UPDATE "Project" p
SET "clientPm" = u.id
FROM "User" u
WHERE p."clientPm_backup" IS NOT NULL
  AND u."clientId" = p."clientPm_backup"
  AND (u."userType" ILIKE 'client')
  AND (p."clientPm" IS DISTINCT FROM u.id);

-- 6) Optional cleanup: any Project rows still pointing to a non-existent user become NULL
UPDATE "Project" p
SET "clientPm" = NULL
WHERE p."clientPm" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "User" u WHERE u.id = p."clientPm"
  );

-- NOTE: Leave the clientPm_backup column for audit; you may drop it after verifying results
-- ALTER TABLE "Project" DROP COLUMN "clientPm_backup";
