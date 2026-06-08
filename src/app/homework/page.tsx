'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';

export default function HomeworkLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const { data } = await db()
      .from('students')
      .select('student_code')
      .eq('student_code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();
    setLoading(false);
    if (!data) {
      setError('ไม่พบรหัสนักเรียนนี้ครับ กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    router.push(`/homework/${data.student_code}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-gray-800">ENG SPARK</h1>
          <p className="text-gray-500 mt-1">ส่งการบ้าน / ดูผลการเรียน</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสนักเรียน
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="เช่น ENG001"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              autoCapitalize="characters"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ →'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          หากลืมรหัส กรุณาติดต่อครูโดยตรงครับ
        </p>
      </div>
    </main>
  );
}
