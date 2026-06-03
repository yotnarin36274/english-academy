'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GROUPS, GroupKey, getLevel } from '@/lib/testData';
import { supabase } from '@/lib/supabase';

function getBangkokDate(): string {
  const now = new Date();
  // UTC+7
  const bangkokMs = now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000;
  return new Date(bangkokMs).toISOString().split('T')[0];
}

function TestPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const groupKey = params.group as GroupKey;
  const nickname = searchParams.get('nickname') ?? '';
  const fullName = searchParams.get('fullName') ?? '';
  const grade = searchParams.get('grade') ?? '';

  const groupData = GROUPS[groupKey];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const storageKey = `testAnswers_${groupKey}`;

  // Restore from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        setAnswers(parsed);
        const lastAnswered = Math.max(0, ...Object.keys(parsed).map(Number));
        const resumeIndex = Math.min(lastAnswered, groupData.totalQuestions - 1);
        setCurrentIndex(resumeIndex);
        setSelectedOption(parsed[String(resumeIndex + 1)] ?? null);
      }
    } catch {
      // ignore
    }
  }, [storageKey, groupData.totalQuestions]);

  // Redirect if missing params
  useEffect(() => {
    if (!groupData || !nickname || !grade) {
      router.replace('/');
    }
  }, [groupData, nickname, grade, router]);

  const currentQuestion = groupData?.questions[currentIndex];
  const isLast = currentIndex === groupData?.totalQuestions - 1;
  const totalQuestions = groupData?.totalQuestions ?? 0;

  const selectOption = useCallback(
    (option: string) => {
      if (submitting) return;
      setSelectedOption(option);
      const updated = { ...answers, [String(currentIndex + 1)]: option };
      setAnswers(updated);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
    },
    [submitting, submitted, answers, currentIndex, storageKey]
  );

  const goNext = useCallback(() => {
    if (!selectedOption) return;
    setCurrentIndex((i) => i + 1);
    const nextAnswer = answers[String(currentIndex + 2)] ?? null;
    setSelectedOption(nextAnswer);
  }, [selectedOption, currentIndex, answers]);

  const handleSubmit = useCallback(async () => {
    if (!selectedOption || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const finalAnswers = { ...answers, [String(currentIndex + 1)]: selectedOption };

    const wrongQuestions: number[] = [];
    for (const q of groupData.questions) {
      if (finalAnswers[String(q.number)] !== groupData.answerKey[q.number]) {
        wrongQuestions.push(q.number);
      }
    }

    const score = groupData.totalQuestions - wrongQuestions.length;
    const level = getLevel(score, groupData.levelCutoffs);

    try {
      const { error } = await supabase.from('submissions').insert([
        {
          session_date: getBangkokDate(),
          group_key: groupKey,
          nickname,
          full_name: fullName || null,
          grade,
          answers: finalAnswers,
          score,
          total: groupData.totalQuestions,
          level,
          wrong_questions: wrongQuestions,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);

      if (error) throw error;

      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }

      router.push('/done');
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitting(false);
      setSubmitError('เกิดข้อผิดพลาดในการส่งคำตอบ กรุณาลองใหม่อีกครั้งครับ');
    }
  }, [
    selectedOption,
    submitting,
    answers,
    currentIndex,
    groupData,
    groupKey,
    nickname,
    fullName,
    grade,
    storageKey,
    router,
  ]);

  if (!groupData || !nickname || !grade) return null;

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span className="font-medium text-gray-700">
              {currentIndex + 1} / {totalQuestions}
            </span>
            <span>{groupData.label}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: '#1D9E75' }}
            />
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Reading passage */}
        {currentQuestion.passage && (
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-gray-700 leading-relaxed">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
              Read the passage
            </p>
            <p>{currentQuestion.passage}</p>
          </div>
        )}

        {/* Question */}
        <p className="text-lg font-semibold text-gray-900 mb-5 leading-snug">
          <span className="text-[#1D9E75] font-bold mr-2">{currentIndex + 1}.</span>
          {currentQuestion.text}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {OPTION_KEYS.map((key) => {
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
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: isSelected ? '#1D9E75' : '#f3f4f6',
                    color: isSelected ? 'white' : '#374151',
                  }}
                >
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
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-3 text-center">
              {submitError}
            </p>
          )}
          {!isLast ? (
            <button
              onClick={goNext}
              disabled={!selectedOption}
              className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all"
              style={{
                backgroundColor: selectedOption ? '#1D9E75' : '#d1d5db',
                cursor: selectedOption ? 'pointer' : 'not-allowed',
              }}
            >
              ถัดไป / Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption || submitting}
              className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: selectedOption && !submitting ? '#1D9E75' : '#d1d5db',
                cursor: selectedOption && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  กำลังส่ง...
                </>
              ) : (
                'ส่งคำตอบ / Submit'
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function TestPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>}>
      <TestPage />
    </Suspense>
  );
}
