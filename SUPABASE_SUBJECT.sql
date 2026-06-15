-- Add subject field to sessions and per-subject quotas to students
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS subject_quotas JSONB DEFAULT '{}';
