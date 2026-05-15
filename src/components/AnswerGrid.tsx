'use client';

import { useState } from 'react';

interface AnswerGridProps {
  answers: Record<string, string>;
  answerKey: Record<number, string>;
  totalQuestions: number;
}

export default function AnswerGrid({ answers, answerKey, totalQuestions }: AnswerGridProps) {
  const [tooltip, setTooltip] = useState<number | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
        const studentAnswer = answers[String(qNum)] ?? '—';
        const correctAnswer = answerKey[qNum];
        const isCorrect = studentAnswer === correctAnswer;

        return (
          <div key={qNum} className="relative">
            <button
              className="w-10 h-10 rounded-full text-xs font-bold text-white flex items-center justify-center cursor-default select-none transition-transform hover:scale-110 focus:outline-none"
              style={{ backgroundColor: isCorrect ? '#1D9E75' : '#EF9F27' }}
              onMouseEnter={() => !isCorrect && setTooltip(qNum)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={() => !isCorrect && setTooltip(qNum)}
              onBlur={() => setTooltip(null)}
              aria-label={`Q${qNum}: ${studentAnswer}${!isCorrect ? ` (correct: ${correctAnswer})` : ''}`}
            >
              {qNum}
            </button>
            {!isCorrect && tooltip === qNum && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 whitespace-nowrap">
                <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg">
                  <span className="text-[#EF9F27]">{studentAnswer}</span>
                  {' → '}
                  <span className="text-[#1D9E75] font-bold">{correctAnswer}</span>
                </div>
                <div className="w-2 h-2 bg-gray-800 rotate-45 mx-auto -mt-1" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
