import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;

let _instance: SupabaseClient | null = null;

function getInstance(): SupabaseClient {
  if (!_instance) {
    _instance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _instance;
}

// Lazy proxy — createClient is only called when first accessed at runtime
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getInstance(), prop, receiver);
  },
});

export interface Submission {
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
}
