export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      submissions: {
        Row: {
          id: string;
          created_at: string;
          session_date: string;
          group_key: string;
          nickname: string;
          full_name: string | null;
          grade: string;
          answers: Record<string, string>;
          score: number;
          total: number;
          level: string;
          wrong_questions: number[];
        };
        Insert: {
          session_date: string;
          group_key: string;
          nickname: string;
          full_name?: string | null;
          grade: string;
          answers: Record<string, string>;
          score: number;
          total: number;
          level: string;
          wrong_questions: number[];
        };
        Update: {
          session_date?: string;
          group_key?: string;
          nickname?: string;
          full_name?: string | null;
          grade?: string;
          answers?: Record<string, string>;
          score?: number;
          total?: number;
          level?: string;
          wrong_questions?: number[];
        };
        Relationships: [];
      };
      students: {
        Row: {
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
        };
        Insert: {
          student_code: string;
          nickname: string;
          full_name?: string | null;
          grade: string;
          group_key: string;
          parent_line_notify_token?: string | null;
          parent_token?: string;
          notes?: string | null;
          is_active?: boolean;
          total_course_hours?: number | null;
          session_type?: 'fixed' | 'hourly';
        };
        Update: {
          student_code?: string;
          nickname?: string;
          full_name?: string | null;
          grade?: string;
          group_key?: string;
          parent_line_notify_token?: string | null;
          parent_token?: string;
          notes?: string | null;
          is_active?: boolean;
          total_course_hours?: number | null;
          session_type?: 'fixed' | 'hourly';
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string | null;
          due_date: string | null;
          target_groups: string[];
          target_student_ids: string[];
          max_score: number;
          is_active: boolean;
        };
        Insert: {
          title: string;
          description?: string | null;
          due_date?: string | null;
          target_groups?: string[];
          target_student_ids?: string[];
          max_score?: number;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          description?: string | null;
          due_date?: string | null;
          target_groups?: string[];
          target_student_ids?: string[];
          max_score?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      homework_submissions: {
        Row: {
          id: string;
          created_at: string;
          student_id: string;
          assignment_id: string;
          image_urls: string[];
          note: string | null;
          status: 'pending' | 'reviewed';
          submitted_at: string;
        };
        Insert: {
          student_id: string;
          assignment_id: string;
          image_urls?: string[];
          note?: string | null;
          status?: 'pending' | 'reviewed';
          submitted_at?: string;
        };
        Update: {
          student_id?: string;
          assignment_id?: string;
          image_urls?: string[];
          note?: string | null;
          status?: string;
          submitted_at?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          created_at: string;
          submission_id: string;
          student_id: string;
          assignment_id: string;
          score: number | null;
          max_score: number;
          comment: string | null;
          reviewed_at: string;
        };
        Insert: {
          submission_id: string;
          student_id: string;
          assignment_id: string;
          score?: number | null;
          max_score: number;
          comment?: string | null;
          reviewed_at?: string;
        };
        Update: {
          submission_id?: string;
          student_id?: string;
          assignment_id?: string;
          score?: number | null;
          max_score?: number;
          comment?: string | null;
          reviewed_at?: string;
        };
        Relationships: [];
      };
      class_sessions: {
        Row: {
          id: string;
          created_at: string;
          session_date: string;
          topic: string;
          duration_hours: number;
          group_key: string | null;
          student_ids: string[];
          week_number: number | null;
          notes: string | null;
        };
        Insert: {
          session_date: string;
          topic: string;
          duration_hours: number;
          group_key?: string | null;
          student_ids?: string[];
          week_number?: number | null;
          notes?: string | null;
        };
        Update: {
          session_date?: string;
          topic?: string;
          duration_hours?: number;
          group_key?: string | null;
          student_ids?: string[];
          week_number?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          created_at: string;
          session_id: string;
          student_id: string;
          status: 'present' | 'absent' | 'leave';
        };
        Insert: {
          session_id: string;
          student_id: string;
          status: 'present' | 'absent' | 'leave';
        };
        Update: {
          session_id?: string;
          student_id?: string;
          status?: 'present' | 'absent' | 'leave';
        };
        Relationships: [];
      };
      makeup_classes: {
        Row: {
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
        };
        Insert: {
          attendance_id: string;
          student_id: string;
          session_id?: string | null;
          topic: string;
          duration_hours: number;
          completed?: boolean;
          completed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          attendance_id?: string;
          student_id?: string;
          session_id?: string | null;
          topic?: string;
          duration_hours?: number;
          completed?: boolean;
          completed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          id: string;
          created_at: string;
          student_id: string;
          quiz_key: string;
          bank_version: number;
          answers: Record<string, string>;
          score: number;
          total: number;
          wrong_questions: number[];
          analysis: Json;
        };
        Insert: {
          student_id: string;
          quiz_key: string;
          bank_version?: number;
          answers: Record<string, string>;
          score: number;
          total: number;
          wrong_questions?: number[];
          analysis: Json;
        };
        Update: {
          student_id?: string;
          quiz_key?: string;
          bank_version?: number;
          answers?: Record<string, string>;
          score?: number;
          total?: number;
          wrong_questions?: number[];
          analysis?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
