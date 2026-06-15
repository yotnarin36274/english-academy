-- Session report: video URL + class summary per session
CREATE TABLE IF NOT EXISTS session_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE UNIQUE,
  video_url TEXT,
  summary TEXT
);

ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON session_reports FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "anon_all"   ON session_reports FOR ALL TO anon   USING (true) WITH CHECK (true);

-- Individual feedback per student per session
CREATE TABLE IF NOT EXISTS session_student_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  feedback TEXT,
  UNIQUE(session_id, student_id)
);

ALTER TABLE session_student_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON session_student_feedback FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "anon_all"   ON session_student_feedback FOR ALL TO anon   USING (true) WITH CHECK (true);

-- IMPORTANT: Also create a Storage bucket named "session-videos" (public) in Supabase Dashboard → Storage
