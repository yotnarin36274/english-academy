'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, QuizAttempt } from '@/lib/db';
import { QUIZ_KEYS, QUIZ_SETS } from '@/lib/quizData';

export default function QuizChooserPage() {
  const { studentCode } = useParams<{ studentCode: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: stu } = await db()
        .from('students').select('*')
        .eq('student_code', studentCode.toUpperCase()).eq('is_active', true).single();
      if (!stu) { router.replace('/quiz'); return; }
      setStudent(stu as Student);
      const { data: atts } = await db()
        .from('quiz_attempts').select('*')
        .eq('student_id', (stu as Student).id)
        .order('created_at', { ascending: false });
      setAttempts((atts ?? []) as QuizAttempt[]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-r from-[#1D9E75] to-green-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <a href={`/homework/${studentCode}`} className="text-sm text-green-100 hover:text-white">← กลับหน้าการบ้าน</a>
          <h1 className="text-xl font-bold mt-2">📝 Quiz ทบทวน Grammar</h1>
          <p className="text-green-100 text-sm">สวัสดีน้อง{student?.nickname} 👋 เลือกชุดที่อยากฝึกได้เลย</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-3">
        {QUIZ_KEYS.map(key => {
          const set = QUIZ_SETS[key];
          const setAttempts = attempts.filter(a => a.quiz_key === key);
          const last = setAttempts[0];
          const best = setAttempts.reduce<number | null>((m, a) => m === null || a.score > m ? a.score : m, null);
          return (
            <a key={key} href={`/quiz/${studentCode}/${key}`}
              className="block bg-white rounded-2xl shadow-sm border-2 border-gray-100 hover:border-[#1D9E75] p-4 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{set.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{set.thaiLabel}</p>
                  <p className="text-xs text-gray-400">{set.totalQuestions} ข้อ · บอกเล่า ปฏิเสธ คำถาม</p>
                </div>
                <span className="text-gray-300">→</span>
              </div>
              {setAttempts.length > 0 && (
                <div className="flex gap-2 mt-3 text-xs">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">ทำแล้ว {setAttempts.length} ครั้ง</span>
                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full">ล่าสุด {last.score}/{last.total}</span>
                  {best !== null && <span className="bg-green-50 text-green-600 px-2 py-1 rounded-full">ดีสุด {best}/{set.totalQuestions}</span>}
                </div>
              )}
            </a>
          );
        })}

        {attempts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🕐 ประวัติการทำล่าสุด</h2>
            <div className="space-y-2">
              {attempts.slice(0, 8).map(a => {
                const set = QUIZ_SETS[a.quiz_key as keyof typeof QUIZ_SETS];
                const pct = Math.round((a.score / a.total) * 100);
                return (
                  <a key={a.id} href={`/quiz/results/${a.id}`}
                    className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="text-lg">{set?.emoji ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{set?.thaiLabel ?? a.quiz_key}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(a.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {a.score}/{a.total}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
