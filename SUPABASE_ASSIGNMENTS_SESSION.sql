-- Link assignments to sessions/courses
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES class_sessions(id);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id  UUID REFERENCES courses(id);
