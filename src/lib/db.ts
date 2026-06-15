export interface Student {
  id: string;
  created_at: string;
  student_code: string;
  nickname: string;
  full_name: string | null;
  grade: string;
  group_key: string;
  parent_line_notify_token: string | null;
  parent_token: string;
  notes: string | null;
  is_active: boolean;
  total_course_hours: number | null;
  session_type: 'fixed' | 'hourly';
  level: string | null;
}

export interface ClassSession {
  id: string;
  created_at: string;
  session_date: string;
  topic: string;
  duration_hours: number;
  group_key: string | null;
  student_ids: string[];
  week_number: number | null;
  notes: string | null;
}

export interface Attendance {
  id: string;
  created_at: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'leave';
}

export interface MakeupClass {
  id: string;
  created_at: string;
  attendance_id: string;
  student_id: string;
  session_id: string | null;
  topic: string;
  duration_hours: number;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export interface Assignment {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  due_date: string | null;
  target_groups: string[];
  target_student_ids: string[];
  max_score: number;
  is_active: boolean;
}

export interface HomeworkSubmission {
  id: string;
  created_at: string;
  student_id: string;
  assignment_id: string;
  image_urls: string[];
  note: string | null;
  status: 'pending' | 'reviewed';
  submitted_at: string;
  students?: Student;
  assignments?: Assignment;
  feedback?: FeedbackRow[];
}

export interface FeedbackRow {
  id: string;
  created_at: string;
  submission_id: string;
  student_id: string;
  assignment_id: string;
  score: number | null;
  max_score: number;
  comment: string | null;
  reviewed_at: string;
  homework_submissions?: HomeworkSubmission;
  assignments?: Assignment;
  students?: Student;
}

export interface InClassAssessment {
  id: string;
  created_at: string;
  session_id: string;
  student_id: string;
  skill_ratings: Record<string, number>;
  behavior_tags: string[];
  quick_note: string | null;
}

export interface SessionReport {
  id: string;
  created_at: string;
  updated_at: string;
  session_id: string;
  video_url: string | null;
  summary: string | null;
}

export interface SessionStudentFeedback {
  id: string;
  created_at: string;
  session_id: string;
  student_id: string;
  feedback: string | null;
}

export const GROUP_LABELS: Record<string, string> = {
  p46: 'ป.4–ป.6',
  m13: 'ม.1–ม.3',
  m46: 'ม.4–ม.6',
};
