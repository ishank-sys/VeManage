-- Add IFA/IFC version columns to ProjectPackage
-- Run this in Supabase SQL editor

ALTER TABLE "ProjectPackage"
  ADD COLUMN IF NOT EXISTS ifaversion text,
  ADD COLUMN IF NOT EXISTS ifcversion text;