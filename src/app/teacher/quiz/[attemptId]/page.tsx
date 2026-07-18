'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, QuizAttempt } from '@/lib/db';
import { QUIZ_SETS, SENTENCE_TYPE_LABELS, isQuizKey, subskillLabel, type SentenceType } from '@/lib/quizData';

export default function TeacherQuizDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('teacher_auth') !== '1') {
      router.replace('/hub');
      return;
    }
    (async () => {
      const { data } = await db()
        .from('quiz_attempts').select('*, students(*)')
        .eq('id', attemptId).single();
      if (data) {
        const att = data as QuizAttempt;
        setAttempt(att);
        setStudent((att.students as Student) ?? null);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  if (!attempt || !isQuizKey(attempt.quiz_key)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-600">ไม่พบข้อมูล Quiz นี้</p>
          <a href="/teacher/quiz" className="text-sm text-blue-500 mt-2 inline-block">← กลับ</a>
        </div>
      </main>
    );
  }

  const set = QUIZ_SETS[attempt.quiz_key];
  const analysis = attempt.analysis;
  const wrongSet = new Set(attempt.wrong_questions);
  const pct = Math.round((attempt.score / attempt.total) * 100);

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-5">
        <div className="max-w-4xl mx-auto">
          <a href="/teacher/quiz" className="text-sm text-gray-400 hover:text-gray-600">← กลับรวมผล Quiz</a>
          <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-black text-gray-900">{set.emoji} {set.thaiLabel}</h1>
              <p className="text-sm text-gray-500">
                น้อง{student?.nickname ?? '—'} · {new Date(attempt.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-black ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {attempt.score}/{attempt.total}
              </span>
              <a href={`/teacher/quiz/${attempt.id}/print`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
                🖨️ สร้างใบงานเสริม
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-5 grid gap-4 lg:grid-cols-[300px_1fr] items-start">
        {/* Analysis sidebar */}
        <div className="space-y-4">
          {analysis?.bySentenceType && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">📊 แยกตามชนิดประโยค</h2>
              <div className="space-y-2.5">
                {(Object.keys(SENTENCE_TYPE_LABELS) as SentenceType[]).map(st => {
                  const t = analysis.bySentenceType[st];
                  if (!t || t.total === 0) return null;
                  const correct = t.total - t.wrong;
                  const p = Math.round((correct / t.total) * 100);
                  const color = p >= 80 ? '#1D9E75' : p >= 60 ? '#EF9F27' : '#ef4444';
                  return (
                    <div key={st}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{SENTENCE_TYPE_LABELS[st]}</span>
                        <span className="font-semibold" style={{ color }}>{correct}/{t.total}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🎯 จุดอ่อน</h2>
            {(analysis?.weakSubskills ?? []).length === 0 ? (
              <p className="text-xs text-green-600">✅ ไม่มีจุดอ่อนชัดเจน</p>
            ) : (
              <div className="space-y-2">
                {analysis.weakSubskills.map(sk => {
                  const info = subskillLabel(attempt.quiz_key as never, sk);
                  const t = analysis.bySubskill[sk];
                  return (
                    <div key={sk} className="bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-amber-800">{info?.thaiLabel ?? sk}</p>
                        {t && <span className="text-[11px] font-bold text-red-500 shrink-0">ผิด {t.wrong}/{t.total}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Per-question review */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">📄 คำตอบรายข้อ</h2>
          <div className="space-y-2">
            {set.questions.map(q => {
              const given = attempt.answers[String(q.number)];
              const wrong = wrongSet.has(q.number);
              const info = subskillLabel(attempt.quiz_key as never, q.subskill);
              return (
                <div key={q.number}
                  className={`rounded-xl border px-3 py-2.5 ${wrong ? 'bg-red-50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-sm">{wrong ? '❌' : '✅'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        <span className="font-bold mr-1">{q.number}.</span>{q.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                        {wrong ? (
                          <>
                            <span className="text-red-600">ตอบ: <b>{given ?? '—'}</b>{given && ` (${q.options[given as keyof typeof q.options] ?? ''})`}</span>
                            <span className="text-green-700">เฉลย: <b>{q.answer}</b> ({q.options[q.answer]})</span>
                          </>
                        ) : (
                          <span className="text-green-700">ตอบ: <b>{q.answer}</b> ({q.options[q.answer]})</span>
                        )}
                        <span className="text-gray-400">· {info?.thaiLabel ?? q.subskill}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
