-- In-Class Assessment table
CREATE TABLE IF NOT EXISTS in_class_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  skill_ratings JSONB DEFAULT '{}',
  behavior_tags TEXT[] DEFAULT '{}',
  quick_note TEXT,
  UNIQUE(session_id, student_id)
);

ALTER TABLE in_class_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON in_class_assessments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON in_class_assessments FOR ALL TO anon USING (true) WITH CHECK (true);
