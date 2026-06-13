-- =====================================================
-- ENG SPARK — Attendance & Makeup System Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add course hour fields to students
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS total_course_hours numeric,
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'fixed';
-- session_type: 'fixed' = กำหนดชม.ทั้งหมด, 'hourly' = จ่ายรายชม.

-- 2. Class sessions (คาบเรียนแต่ละครั้ง)
CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  session_date date NOT NULL,
  topic text NOT NULL,
  duration_hours numeric NOT NULL DEFAULT 1.5,
  group_key text,
  student_ids text[] NOT NULL DEFAULT '{}',
  week_number int,
  notes text
);

-- 3. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  session_id uuid NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
  UNIQUE(session_id, student_id)
);

ALTER TABLE attendance REPLICA IDENTITY FULL;

-- 4. Makeup classes
CREATE TABLE IF NOT EXISTS makeup_classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  attendance_id uuid NOT NULL REFERENCES attendance(id) ON DELETE CASCADE UNIQUE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id uuid REFERENCES class_sessions(id) ON DELETE SET NULL,
  topic text NOT NULL,
  duration_hours numeric NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text
);

-- 5. RLS policies (permissive — URL-security model)
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_sessions" ON class_sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE makeup_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_makeup" ON makeup_classes FOR ALL USING (true) WITH CHECK (true);
