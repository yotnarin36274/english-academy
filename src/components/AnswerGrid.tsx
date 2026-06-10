'use client';

import { useState } from 'react';
import type { Question, Skill } from '@/lib/testData';
import type { ExplanationSet } from '@/lib/explanationsData';

interface AnswerGridProps {
  answers: Record<string, string>;
  answerKey: Record<number, string>;
  totalQuestions: number;
  questions: Question[];
  skills: Skill[];
  explanations?: Record<number, ExplanationSet>;
}

export default function AnswerGrid({ answers, answerKey, totalQuestions, questions, skills, explanations }: AnswerGridProps) {
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  const questionMap = new Map(questions.map((q) => [q.number, q]));

  function skillForQ(qNum: number) {
    return skills.find((s) => s.questions.includes(qNum));
  }

  function handleBubbleClick(qNum: number) {
    setActiveQuestion((prev) => (prev === qNum ? null : qNum));
  }

  const activeQ = activeQuestion !== null ? questionMap.get(activeQuestion) : undefined;
  const studentAnswer = activeQuestion !== null ? (answers[String(activeQuestion)] ?? '—') : '—';
  const correctAnswer = activeQuestion !== null ? answerKey[activeQuestion] : '';
  const isActiveCorrect = studentAnswer === correctAnswer;
  const activeSkill = activeQuestion !== null ? skillForQ(activeQuestion) : undefined;
  const activeExplanations = activeQuestion !== null ? explanations?.[activeQuestion] : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
          const sa = answers[String(qNum)] ?? '—';
          const ca = answerKey[qNum];
          const isCorrect = sa === ca;
          const isActive = activeQuestion === qNum;

          return (
            <button
              key={qNum}
              onClick={() => handleBubbleClick(qNum)}
              className={`w-10 h-10 rounded-full text-xs font-bold text-white flex items-center justify-center transition-all hover:scale-110 focus:outline-none ${
                isActive ? 'scale-110 ring-2 ring-offset-1 ring-gray-500' : ''
              }`}
              style={{ backgroundColor: isCorrect ? '#1D9E75' : '#EF9F27' }}
              aria-label={`Q${qNum}: ${sa}${!isCorrect ? ` (correct: ${ca})` : ''}`}
              aria-expanded={isActive}
            >
              {qNum}
            </button>
          );
        })}
      </div>

      {activeQuestion !== null && activeQ && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm space-y-3">
          <p className="font-semibold text-gray-800 leading-snug">
            Q{activeQuestion}: {activeQ.text}
          </p>

          {activeQ.passage && (
            <div className="text-xs text-gray-500 italic bg-white rounded-lg p-3 border border-gray-100 leading-relaxed max-h-32 overflow-y-auto">
              {activeQ.passage}
            </div>
          )}

          <div className="space-y-1.5">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => {
              const optionText = activeQ.options[letter];
              const isStudentChoice = studentAnswer === letter;
              const isCorrectAnswer = correctAnswer === letter;

              let borderColor = '#e5e7eb';
              let bgColor = 'white';
              let color = '#374151';

              if (isStudentChoice && isActiveCorrect) {
                borderColor = '#1D9E75'; bgColor = '#E1F5EE'; color = '#085041';
              } else if (isStudentChoice && !isActiveCorrect) {
                borderColor = '#EF9F27'; bgColor = '#FEF3E2'; color = '#633806';
              } else if (!isActiveCorrect && isCorrectAnswer) {
                borderColor = '#1D9E75'; bgColor = '#E1F5EE'; color = '#085041';
              }

              return (
                <div
                  key={letter}
                  className="px-3 py-2 rounded-lg border"
                  style={{ borderColor, backgroundColor: bgColor, color }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold flex-shrink-0 w-4">{letter}.</span>
                    <span className="flex-1">{optionText}</span>
                    {isStudentChoice && !isActiveCorrect && (
                      <span className="text-xs font-semibold flex-shrink-0">คำตอบของน้อง</span>
                    )}
                    {!isActiveCorrect && isCorrectAnswer && (
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#1D9E75' }}>✓ เฉลย</span>
                    )}
                    {isStudentChoice && isActiveCorrect && (
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#1D9E75' }}>✓ ถูก</span>
                    )}
                  </div>
                  {activeExplanations && (
                    <p className="text-xs text-gray-500 mt-1 ml-5 leading-snug">
                      {activeExplanations[letter]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {activeSkill && (
            <p className="text-xs text-gray-400 pt-1">
              ทักษะ: {activeSkill.thaiLabel} / {activeSkill.englishLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
