'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, Submission } from '@/lib/supabase';
import { GROUPS, GroupKey, getLevelBadgeStyle } from '@/lib/testData';
import { computeSkillResults } from '@/lib/reportGenerator';
import { EXPLANATIONS } from '@/lib/explanationsData';
import AnswerGrid from '@/components/AnswerGrid';
import SkillBar from '@/components/SkillBar';

export default function ResultPage() {
  const params = useParams();
  const id = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setSubmission(data as Submission);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-[#1D9E75]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </main>
    );
  }

  if (notFound || !submission) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-bold text-gray-800 mb-2">ไม่พบผลการสอบ</h1>
        <p className="text-gray-500 text-sm">Result not found. Please check the link again.</p>
      </main>
    );
  }

  const groupData = GROUPS[submission.group_key as GroupKey];
  if (!groupData) return null;

  const skillResults = computeSkillResults(submission, groupData);
  const strongSkills = skillResults.filter((r) => r.isStrong);
  const weakSkills = skillResults.filter((r) => !r.isStrong);
  const percent = Math.round((submission.score / submission.total) * 100);
  const levelStyle = getLevelBadgeStyle(submission.level);

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-5">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
            English Academy — ผลการสอบวัดระดับ
          </p>
          <h1 className="text-2xl font-extrabold text-gray-900">{submission.nickname}</h1>
          {submission.full_name && (
            <p className="text-sm text-gray-500 mt-0.5">{submission.full_name}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {submission.grade}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {groupData.label}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <p className="text-5xl font-extrabold" style={{ color: '#1D9E75' }}>
            {submission.score}
            <span className="text-2xl text-gray-400 font-normal"> / {submission.total}</span>
          </p>
          <p className="text-lg text-gray-500 mt-1">{percent}%</p>
          <div className="mt-3 flex justify-center">
            <span
              className="text-base font-bold px-4 py-1.5 rounded-full"
              style={levelStyle}
            >
              {submission.level}
            </span>
          </div>
        </div>

        {/* Answer overview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Answer Overview — กดหมายเลขข้อเพื่อดูรายละเอียด
          </p>
          <AnswerGrid
            answers={submission.answers}
            answerKey={groupData.answerKey}
            totalQuestions={submission.total}
            questions={groupData.questions}
            skills={groupData.skills}
            explanations={EXPLANATIONS[submission.group_key]}
          />
        </div>

        {/* Skill breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
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

        {/* Feedback */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4 text-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            📋 จุดเด่น & คำแนะนำ
          </p>

          <div>
            <p className="font-semibold text-gray-700 mb-1">✅ จุดเด่น</p>
            {strongSkills.length > 0 ? (
              <ul className="space-y-1">
                {strongSkills.map((r) => (
                  <li key={r.skill.key} className="text-gray-600">
                    • <span className="font-medium">{r.skill.thaiLabel}</span>:{' '}
                    {groupData.skillFeedback[r.skill.key].strong}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">• ทุกด้านอยู่ในระดับที่ควรพัฒนาต่อครับ</p>
            )}
          </div>

          {weakSkills.length > 0 && (
            <div>
              <p className="font-semibold text-gray-700 mb-1">📈 จุดที่ต้องพัฒนา</p>
              <ul className="space-y-1">
                {weakSkills.map((r) => (
                  <li key={r.skill.key} className="text-gray-600">
                    • <span className="font-medium">{r.skill.thaiLabel}</span>:{' '}
                    {groupData.skillFeedback[r.skill.key].weakTip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
