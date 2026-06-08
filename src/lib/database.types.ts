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
        Insert: Omit<Database['public']['Tables']['submissions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['submissions']['Row']>;
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
        };
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'parent_token'> & { parent_token?: string };
        Update: Partial<Database['public']['Tables']['students']['Row']>;
      };
      assignments: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string | null;
          due_date: string | null;
          target_groups: string[];
          max_score: number;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['assignments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['assignments']['Row']>;
      };
      homework_submissions: {
        Row: {
          id: string;
          created_at: string;
          student_id: string;
          assignment_id: string;
          image_urls: string[];
          note: string | null;
          status: string;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['homework_submissions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['homework_submissions']['Row']>;
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
        Insert: Omit<Database['public']['Tables']['feedback']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['feedback']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
