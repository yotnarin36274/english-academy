'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student } from '@/lib/db';
import { QUIZ_SETS, isQuizKey, gradeAttempt, type OptionKey } from '@/lib/quizData';

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

export default function QuizTakingPage() {
  const { studentCode, quizKey } = useParams<{ studentCode: string; quizKey: string }>();
  const router = useRouter();

  const set = isQuizKey(quizKey) ? QUIZ_SETS[quizKey] : null;
  const storageKey = `quizAnswers_${studentCode}_${quizKey}`;

  const [student, setStudent] = useState<Student | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Resolve student; redirect on bad code or quiz key
  useEffect(() => {
    if (!set) { router.replace('/quiz'); return; }
    (async () => {
      const { data: stu } = await db()
        .from('students').select('*')
        .eq('student_code', studentCode.toUpperCase()).eq('is_active', true).single();
      if (!stu) { router.replace('/quiz'); return; }
      setStudent(stu as Student);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode, quizKey]);

  // Restore progress from sessionStorage
  useEffect(() => {
    if (!set || typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        setAnswers(parsed);
        const lastAnswered = Math.max(0, ...Object.keys(parsed).map(Number));
        const resumeIndex = Math.min(lastAnswered, set.totalQuestions - 1);
        setCurrentIndex(resumeIndex);
        setSelectedOption(parsed[String(resumeIndex + 1)] ?? null);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const currentQuestion = set?.questions[currentIndex];
  const totalQuestions = set?.totalQuestions ?? 0;
  const isLast = currentIndex === totalQuestions - 1;

  const selectOption = useCallback((option: string) => {
    if (submitting) return;
    setSelectedOption(option);
    const updated = { ...answers, [String(currentIndex + 1)]: option };
    setAnswers(updated);
    try { sessionStorage.setItem(storageKey, JSON.stringify(updated)); } catch { /* ignore */ }
  }, [submitting, answers, currentIndex, storageKey]);

  const goNext = useCallback(() => {
    if (!selectedOption) return;
    setCurrentIndex(i => i + 1);
    setSelectedOption(answers[String(currentIndex + 2)] ?? null);
  }, [selectedOption, currentIndex, answers]);

  const goBack = useCallback(() => {
    if (currentIndex === 0) return;
    setCurrentIndex(i => i - 1);
    setSelectedOption(answers[String(currentIndex)] ?? null);
  }, [currentIndex, answers]);

  const handleSubmit = useCallback(async () => {
    if (!selectedOption || submitting || !set || !student) return;
    setSubmitting(true);
    setSubmitError(null);

    const finalAnswers = { ...answers, [String(currentIndex + 1)]: selectedOption };
    const { score, wrongQuestions, analysis } = gradeAttempt(set.key, finalAnswers);

    try {
      const { data, error } = await db().from('quiz_attempts').insert([{
        student_id: student.id,
        quiz_key: set.key,
        bank_version: set.bankVersion,
        answers: finalAnswers,
        score,
        total: set.totalQuestions,
        wrong_questions: wrongQuestions,
        analysis,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }] as any).select('id').single();
      if (error || !data) throw error ?? new Error('no id returned');

      try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
      router.push(`/quiz/results/${(data as { id: string }).id}`);
    } catch (err) {
      console.error('Quiz submit error:', err);
      setSubmitting(false);
      setSubmitError('เกิดข้อผิดพลาดในการส่งคำตอบ กรุณาลองใหม่อีกครั้งครับ');
    }
  }, [selectedOption, submitting, set, student, answers, currentIndex, storageKey, router]);

  if (!set || !student || !currentQuestion) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;
  }

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span className="font-medium text-gray-700">{currentIndex + 1} / {totalQuestions}</span>
            <span>{set.emoji} {set.thaiLabel}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: '#1D9E75' }} />
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <p className="text-lg font-semibold text-gray-900 mb-5 leading-snug">
          <span className="text-[#1D9E75] font-bold mr-2">{currentIndex + 1}.</span>
          {currentQuestion.text}
        </p>

        <div className="space-y-3">
          {OPTION_KEYS.map(key => {
            const isSelected = selectedOption === key;
            return (
              <button
                key={key}
                onClick={() => selectOption(key)}
                disabled={submitting}
                className="w-full text-left flex items-center gap-3 px-4 rounded-2xl border-2 transition-all duration-150 focus:outline-none"
                style={{
                  minHeight: '56px',
                  borderColor: isSelected ? '#1D9E75' : '#e5e7eb',
                  backgroundColor: isSelected ? '#E1F5EE' : 'white',
                  color: isSelected ? '#085041' : '#374151',
                }}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: isSelected ? '#1D9E75' : '#f3f4f6',
                    color: isSelected ? 'white' : '#374151',
                  }}>
                  {key}
                </span>
                <span className="text-base">{currentQuestion.options[key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom action */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-3 text-center">{submitError}</p>
          )}
          <div className="flex gap-3">
            {currentIndex > 0 && (
              <button onClick={goBack} disabled={submitting}
                className="px-5 py-4 rounded-2xl text-base font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                ←
              </button>
            )}
            {!isLast ? (
              <button onClick={goNext} disabled={!selectedOption}
                className="flex-1 py-4 rounded-2xl text-base font-bold text-white transition-all"
                style={{
                  backgroundColor: selectedOption ? '#1D9E75' : '#d1d5db',
                  cursor: selectedOption ? 'pointer' : 'not-allowed',
                }}>
                ถัดไป / Next
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!selectedOption || submitting}
                className="flex-1 py-4 rounded-2xl text-base font-bold text-white transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: selectedOption && !submitting ? '#1D9E75' : '#d1d5db',
                  cursor: selectedOption && !submitting ? 'pointer' : 'not-allowed',
                }}>
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    กำลังส่ง...
                  </>
                ) : 'ส่งคำตอบ / Submit'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
