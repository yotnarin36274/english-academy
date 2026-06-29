-- Run this once in Supabase → SQL Editor to enable Google Drive
-- file attachments on assignments (shown to students & parents).
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';
