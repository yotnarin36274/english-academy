import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

type TypedClient = SupabaseClient<Database>;

let _instance: TypedClient | null = null;

function getInstance(): TypedClient {
  if (!_instance) {
    _instance = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _instance;
}

export const supabase: TypedClient = new Proxy({} as TypedClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getInstance(), prop, receiver);
  },
}) as TypedClient;

/** Use this in new code — returns the actual typed client (no Proxy) */
export function db(): TypedClient {
  return getInstance();
}

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
