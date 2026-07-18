'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';

export default function QuizEntryPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || checking) return;
    setChecking(true);
    setError(null);
    const { data } = await db()
      .from('students').select('id')
      .eq('student_code', trimmed).eq('is_active', true).single();
    if (data) {
      router.push(`/quiz/${trimmed}`);
    } else {
      setChecking(false);
      setError('ไม่พบรหัสนักเรียนนี้ กรุณาตรวจสอบอีกครั้งหรือติดต่อครูครับ');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📝</div>
          <h1 className="text-2xl font-black text-gray-900">Quiz ทบทวน Grammar</h1>
          <p className="text-sm text-gray-500 mt-1">ENG SPARK ⚡</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสนักเรียน</label>
            <input
              value={code}
              onChange={e => { setCode(e.target.value); setError(null); }}
              placeholder="เช่น MICKY001"
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-widest uppercase focus:border-[#1D9E75] focus:outline-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={!code.trim() || checking}
            className="w-full py-3.5 rounded-2xl text-base font-bold text-white transition-all"
            style={{ backgroundColor: code.trim() && !checking ? '#1D9E75' : '#d1d5db' }}
          >
            {checking ? 'กำลังตรวจสอบ...' : 'เริ่มทำ Quiz →'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-4">
          <a href="/hub" className="hover:text-gray-600">← กลับหน้าหลัก</a>
        </p>
      </div>
    </main>
  );
}
