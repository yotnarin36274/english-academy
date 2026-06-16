-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  description TEXT,
  cover_image_url TEXT,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  student_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "public_all" ON courses TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_all" ON courses TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add course_id to class_sessions
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
