'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, QuizAttempt } from '@/lib/db';
import { QUIZ_SETS, SENTENCE_TYPE_LABELS, isQuizKey, subskillLabel, type SentenceType } from '@/lib/quizData';

export default function QuizResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [attemptId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  if (!attempt || !isQuizKey(attempt.quiz_key)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-600">ไม่พบผลการทำ Quiz นี้ครับ</p>
          <a href="/quiz" className="text-sm text-blue-500 mt-2 inline-block">← กลับหน้า Quiz</a>
        </div>
      </main>
    );
  }

  const set = QUIZ_SETS[attempt.quiz_key];
  const pct = Math.round((attempt.score / attempt.total) * 100);
  const ringColor = pct >= 80 ? '#1D9E75' : pct >= 60 ? '#EF9F27' : '#ef4444';
  const circumference = 2 * Math.PI * 52;
  const analysis = attempt.analysis;
  const weakSubskills = analysis?.weakSubskills ?? [];
  const code = student?.student_code ?? '';

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-r from-[#1D9E75] to-green-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          {code && <a href={`/quiz/${code}`} className="text-sm text-green-100 hover:text-white">← กลับหน้าเลือก Quiz</a>}
          <h1 className="text-xl font-bold mt-2">{set.emoji} ผล Quiz: {set.thaiLabel}</h1>
          {student && <p className="text-green-100 text-sm">น้อง{student.nickname} · {new Date(attempt.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-4">
        {/* Score ring */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={ringColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct / 100)} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ color: ringColor }}>{attempt.score}</span>
              <span className="text-xs text-gray-400">/ {attempt.total}</span>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold" style={{ color: ringColor }}>
            {pct >= 80 ? '🎉 เยี่ยมมาก!' : pct >= 60 ? '💪 ทำได้ดี ฝึกอีกนิดนะ' : '📚 ไม่เป็นไร ฝึกเพิ่มกันครับ'}
          </p>
        </div>

        {/* Sentence type breakdown */}
        {analysis?.bySentenceType && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">📊 แยกตามชนิดประโยค</h2>
            <div className="space-y-3">
              {(Object.keys(SENTENCE_TYPE_LABELS) as SentenceType[]).map(st => {
                const t = analysis.bySentenceType[st];
                if (!t || t.total === 0) return null;
                const correct = t.total - t.wrong;
                const p = Math.round((correct / t.total) * 100);
                const barColor = p >= 80 ? '#1D9E75' : p >= 60 ? '#EF9F27' : '#ef4444';
                return (
                  <div key={st}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{SENTENCE_TYPE_LABELS[st]}</span>
                      <span className="font-semibold" style={{ color: barColor }}>{correct}/{t.total}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weak subskills */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">🎯 จุดที่ควรฝึกเพิ่ม</h2>
          {weakSubskills.length === 0 ? (
            <p className="text-sm text-green-600 bg-green-50 rounded-xl px-4 py-3">
              ✅ ไม่พบจุดอ่อนชัดเจน เก่งมากครับ!
            </p>
          ) : (
            <div className="space-y-3">
              {weakSubskills.map(sk => {
                const info = subskillLabel(attempt.quiz_key as never, sk);
                const t = analysis.bySubskill[sk];
                return (
                  <div key={sk} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-amber-800">{info?.thaiLabel ?? sk}</p>
                      {t && <span className="text-xs font-bold text-red-500 shrink-0">ผิด {t.wrong}/{t.total}</span>}
                    </div>
                    {info?.weakTip && <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">💡 {info.weakTip}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        {code && (
          <div className="flex gap-3">
            <a href={`/quiz/${code}/${attempt.quiz_key}`}
              className="flex-1 py-3.5 rounded-2xl text-center text-base font-bold text-white transition-all"
              style={{ backgroundColor: '#1D9E75' }}>
              🔄 ทำอีกครั้ง
            </a>
            <a href={`/quiz/${code}`}
              className="flex-1 py-3.5 rounded-2xl text-center text-base font-bold text-gray-600 bg-white border-2 border-gray-200 hover:border-gray-300 transition-all">
              เลือกชุดอื่น
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
