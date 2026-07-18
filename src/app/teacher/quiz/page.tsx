'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, QuizAttempt } from '@/lib/db';
import { QUIZ_KEYS, QUIZ_SETS, subskillLabel, isQuizKey } from '@/lib/quizData';

export default function TeacherQuizPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('teacher_auth') !== '1') {
      router.replace('/hub');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    const [sRes, aRes] = await Promise.all([
      db().from('students').select('*').eq('is_active', true).order('nickname'),
      db().from('quiz_attempts').select('*').order('created_at', { ascending: true }),
    ]);
    setStudents((sRes.data ?? []) as Student[]);
    setAttempts((aRes.data ?? []) as QuizAttempt[]);
    setLoading(false);
  }

  // studentId → quizKey → attempts (chronological)
  const byStudent = useMemo(() => {
    const map = new Map<string, Map<string, QuizAttempt[]>>();
    attempts.forEach(a => {
      if (!map.has(a.student_id)) map.set(a.student_id, new Map());
      const m = map.get(a.student_id)!;
      if (!m.has(a.quiz_key)) m.set(a.quiz_key, []);
      m.get(a.quiz_key)!.push(a);
    });
    return map;
  }, [attempts]);

  const studentsWithAttempts = students.filter(s => byStudent.has(s.id));

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-5">
        <div className="max-w-4xl mx-auto">
          <a href="/teacher" className="text-sm text-gray-400 hover:text-gray-600">← กลับหน้าครู</a>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900">📝 Quiz ทบทวน Grammar</h1>
              <p className="text-sm text-gray-500">ผลการทำ Quiz และจุดอ่อนของนักเรียนแต่ละคน</p>
            </div>
            <button onClick={loadData} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors">
              🔄 รีเฟรช
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-5">
        {loading ? (
          <div className="py-16 text-center text-gray-400">กำลังโหลด...</div>
        ) : studentsWithAttempts.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">ยังไม่มีนักเรียนทำ Quiz</p>
            <p className="text-xs mt-2">ส่งลิงก์ให้นักเรียน: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">/quiz</span></p>
          </div>
        ) : (
          <div className="space-y-4">
            {studentsWithAttempts.map(s => {
              const quizMap = byStudent.get(s.id)!;
              return (
                <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">
                      {s.nickname[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{s.nickname}
                        {s.full_name && <span className="text-xs text-gray-400 ml-1.5">({s.full_name})</span>}
                      </p>
                      <p className="text-[11px] text-gray-400">{s.grade}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {QUIZ_KEYS.filter(k => quizMap.has(k)).map(k => {
                      const set = QUIZ_SETS[k];
                      const list = quizMap.get(k)!;
                      const latest = list[list.length - 1];
                      const weak = (latest.analysis?.weakSubskills ?? []);
                      return (
                        <div key={k} className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg">{set.emoji}</span>
                            <p className="text-sm font-semibold text-gray-700">{set.thaiLabel}</p>
                            <span className="text-xs text-gray-400">ทำ {list.length} ครั้ง</span>
                            {/* Score progression */}
                            <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full ml-auto">
                              {list.map(a => a.score).join(' → ')} / {latest.total}
                            </span>
                          </div>
                          {weak.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {weak.map(sk => (
                                <span key={sk} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                                  {isQuizKey(k) ? (subskillLabel(k, sk)?.thaiLabel ?? sk) : sk}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-green-600 mt-2">✅ รอบล่าสุดไม่มีจุดอ่อนชัดเจน</p>
                          )}
                          <div className="flex gap-2 mt-2.5">
                            <a href={`/teacher/quiz/${latest.id}`}
                              className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                              ดูรายละเอียด →
                            </a>
                            <a href={`/teacher/quiz/${latest.id}/print`}
                              className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors">
                              🖨️ ใบงานเสริม
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
