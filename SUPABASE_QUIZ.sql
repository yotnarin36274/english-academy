-- Grammar quiz attempts (unlimited retakes; every attempt kept for progression tracking)
-- Run once in Supabase → SQL Editor
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  quiz_key TEXT NOT NULL,              -- 'present_simple' | 'present_continuous' | 'past_simple'
  bank_version INT NOT NULL DEFAULT 1, -- guards analysis if the question bank is later edited
  answers JSONB NOT NULL,              -- { "1": "A", ..., "20": "C" }
  score INT NOT NULL,
  total INT NOT NULL,
  wrong_questions INT[] NOT NULL DEFAULT '{}',
  analysis JSONB NOT NULL              -- snapshot computed at submit time (bySentenceType/bySubskill/weakSubskills)
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON quiz_attempts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "anon_all"   ON quiz_attempts FOR ALL TO anon   USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id, created_at DESC);
