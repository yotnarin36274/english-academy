'use client';

import { useState, useCallback } from 'react';
import type { Submission } from '@/lib/supabase';
import type { GroupData } from '@/lib/testData';
import { getLevelBadgeStyle } from '@/lib/testData';
import { computeSkillResults, generateLineReport } from '@/lib/reportGenerator';
import AnswerGrid from './AnswerGrid';
import SkillBar from './SkillBar';

interface SubmissionCardProps {
  submission: Submission;
  groupData: GroupData;
  isExpanded: boolean;
  onToggle: () => void;
  isNew?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function avatarColor(nickname: string): string {
  const colors = ['#1D9E75', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'];
  return colors[nickname.charCodeAt(0) % colors.length];
}

type CopyState = 'idle' | 'copied';

export default function SubmissionCard({
  submission,
  groupData,
  isExpanded,
  onToggle,
  isNew,
}: SubmissionCardProps) {
  const [lineCopyState, setLineCopyState] = useState<CopyState>('idle');

  const skillResults = computeSkillResults(submission, groupData);
  const strongSkills = skillResults.filter((r) => r.isStrong);
  const weakSkills = skillResults.filter((r) => !r.isStrong);
  const percent = Math.round((submission.score / submission.total) * 100);
  const levelStyle = getLevelBadgeStyle(submission.level);

  const copyText = useCallback(async (text: string, setter: (s: CopyState) => void) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setter('copied');
    setTimeout(() => setter('idle'), 2000);
  }, []);

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
        isNew ? 'ring-2 ring-[#1D9E75] ring-offset-1' : 'border-gray-200'
      }`}
    >
      {/* Header row — always visible */}
      <button
        className="w-full text-left px-4 py-4 flex items-start gap-3 focus:outline-none"
        onClick={onToggle}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: avatarColor(submission.nickname) }}
        >
          {submission.nickname.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-gray-900 text-base">{submission.nickname}</span>
            {submission.full_name && (
              <span className="text-sm text-gray-400">{submission.full_name}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {submission.grade}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={levelStyle}>
              {submission.level}
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {submission.score} / {submission.total}{' '}
              <span className="text-gray-400 font-normal">({percent}%)</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs text-gray-400">{timeAgo(submission.created_at)}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-4 space-y-5">

          {/* Answer overview */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Answer Overview
            </p>
            <AnswerGrid
              answers={submission.answers}
              answerKey={groupData.answerKey}
              totalQuestions={submission.total}
              questions={groupData.questions}
              skills={groupData.skills}
            />
          </div>

          {/* Skill breakdown */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Skill Breakdown
            </p>
            <div className="space-y-3">
              {skillResults.map((r) => (
                <SkillBar
                  key={r.skill.key}
                  skill={r.skill}
                  correct={r.correct}
                  total={r.total}
                />
              ))}
            </div>
          </div>

          {/* จุดเด่น-จุดพัฒนา-คำแนะนำ */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              📋 จุดเด่น-จุดพัฒนา-คำแนะนำ
            </p>
            <div className="space-y-3 text-sm">

              {/* จุดเด่น */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">✅ จุดเด่น:</p>
                {strongSkills.length > 0 ? (
                  <ul className="space-y-1">
                    {strongSkills.map((r) => (
                      <li key={r.skill.key} className="text-gray-600">
                        • <span className="font-medium">{r.skill.thaiLabel}</span>: {groupData.skillFeedback[r.skill.key].strong}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">• ทุกด้านอยู่ในระดับดีครับ</p>
                )}
              </div>

              {/* จุดที่ต้องพัฒนา — only when there are weak skills */}
              {weakSkills.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">📈 จุดที่ต้องพัฒนา:</p>
                  <ul className="space-y-1">
                    {weakSkills.map((r) => (
                      <li key={r.skill.key} className="text-gray-600">
                        • <span className="font-medium">{r.skill.thaiLabel}</span>: {groupData.skillFeedback[r.skill.key].weakTip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* คำแนะนำ */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">💡 คำแนะนำ:</p>
                {weakSkills.length > 0 ? (
                  <ul className="space-y-1">
                    {weakSkills.map((r) => (
                      <li key={r.skill.key} className="text-gray-600">
                        • {groupData.skillFeedback[r.skill.key].weakTip}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">• รักษาระดับที่ดีไว้และเพิ่มการอ่าน English texts ให้หลากหลายขึ้นครับ</p>
                )}
              </div>

            </div>
          </div>

          {/* LINE report copy button */}
          <div className="pt-1">
            <button
              onClick={() => copyText(generateLineReport(submission, groupData), setLineCopyState)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200"
              style={
                lineCopyState === 'copied'
                  ? { backgroundColor: '#E1F5EE', borderColor: '#1D9E75', color: '#085041' }
                  : { backgroundColor: 'white', borderColor: '#d1d5db', color: '#374151' }
              }
            >
              <span>{lineCopyState === 'copied' ? '✓' : '📱'}</span>
              <span>{lineCopyState === 'copied' ? 'คัดลอกแล้ว!' : 'คัดลอก รายงาน LINE (ละเอียด)'}</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
