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

export const GROUP_LABELS: Record<string, string> = {
  p46: 'ป.4–ป.6',
  m13: 'ม.1–ม.3',
  m46: 'ม.4–ม.6',
};
