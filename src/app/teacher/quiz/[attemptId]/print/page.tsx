'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, QuizAttempt } from '@/lib/db';
import { QUIZ_SETS, isQuizKey, subskillLabel } from '@/lib/quizData';
import { composeWorksheet, EXERCISE_TYPE_INSTRUCTIONS, type Exercise, type ExerciseType, type WorksheetSection } from '@/lib/exerciseBank';

export default function WorksheetPrintPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [sections, setSections] = useState<WorksheetSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);

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
        if (isQuizKey(att.quiz_key)) {
          setSections(composeWorksheet(att.quiz_key, att.analysis?.weakSubskills ?? []));
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  async function generateWithAI() {
    if (!attempt || aiLoading || !isQuizKey(attempt.quiz_key)) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizKey: attempt.quiz_key,
          weakSubskills: attempt.analysis?.weakSubskills ?? [],
          count: 12,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error === 'no_key' ? 'ยังไม่ได้ตั้งค่า AI (GROQ_API_KEY) — ใช้ชีทจากคลังแทนครับ' : 'AI สร้างโจทย์ไม่สำเร็จ — ใช้ชีทจากคลังแทนครับ');
      }
      const { items } = await res.json() as { items: Exercise[] };
      if (!items?.length) throw new Error('AI ไม่ส่งโจทย์กลับมา — ใช้ชีทจากคลังแทนครับ');

      // Regroup AI items into sections by subskill
      const bySubskill = new Map<string, Exercise[]>();
      items.forEach(it => {
        if (!bySubskill.has(it.subskill)) bySubskill.set(it.subskill, []);
        bySubskill.get(it.subskill)!.push(it);
      });
      setSections([...bySubskill.entries()].map(([subskill, list]) => ({
        subskill,
        items: [...list].sort((a, b) => a.type === b.type ? a.id.localeCompare(b.id) : a.type.localeCompare(b.type)),
      })));
      setAiUsed(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
    setAiLoading(false);
  }

  function resetToBank() {
    if (!attempt || !isQuizKey(attempt.quiz_key)) return;
    setSections(composeWorksheet(attempt.quiz_key, attempt.analysis?.weakSubskills ?? []));
    setAiUsed(false);
    setAiError(null);
  }

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
  const thDate = new Date(attempt.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  const weakLabels = (attempt.analysis?.weakSubskills ?? [])
    .map(sk => subskillLabel(attempt.quiz_key as never, sk)?.thaiLabel ?? sk);

  // Global running number across sections, grouped by exercise type inside each section
  let runningNo = 0;

  return (
    <main className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @page { size: A4; margin: 1.5cm; }
        @media print {
          .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; padding: 0 !important; }
          .answer-key { break-before: page; }
          .ws-section { break-inside: avoid; }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3 flex-wrap">
          <a href={`/teacher/quiz/${attempt.id}`} className="text-sm text-gray-400 hover:text-gray-600 shrink-0">← กลับ</a>
          <p className="text-sm font-semibold text-gray-700 flex-1 min-w-0 truncate">
            ใบงานเสริม: น้อง{student?.nickname} · {set.thaiLabel}
          </p>
          <div className="flex items-center gap-2">
            {aiUsed && (
              <button onClick={resetToBank}
                className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors">
                ↩ ใช้คลังโจทย์
              </button>
            )}
            <button onClick={generateWithAI} disabled={aiLoading}
              className="text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
              {aiLoading ? '⏳ กำลังสร้าง...' : '✨ AI สร้างโจทย์ใหม่'}
            </button>
            <button onClick={() => window.print()}
              className="text-sm font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] px-5 py-2 rounded-xl transition-colors">
              🖨️ พิมพ์ / บันทึก PDF
            </button>
          </div>
        </div>
        {aiError && (
          <div className="max-w-3xl mx-auto mt-2">
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">⚠️ {aiError}</p>
          </div>
        )}
      </div>

      {/* ── Worksheet (A4) ── */}
      <div className="sheet max-w-3xl mx-auto bg-white shadow-md my-6 p-10 print:my-0 text-gray-900">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-3 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-black">ENG SPARK ⚡ — ใบงานฝึกเสริม</p>
              <p className="text-sm mt-0.5">{set.thaiLabel} · เสริมจาก Quiz วันที่ {thDate}</p>
            </div>
            <div className="text-right text-sm">
              <p>ชื่อ: <b>{student?.nickname ?? '________'}</b>{student?.full_name ? ` (${student.full_name})` : ''}</p>
              <p className="mt-1">วันที่ทำ: ______________</p>
            </div>
          </div>
          {weakLabels.length > 0 && (
            <p className="text-sm mt-2">
              🎯 <b>จุดที่ฝึกในใบงานนี้:</b> {weakLabels.join(' · ')}
            </p>
          )}
        </div>

        {/* Sections */}
        {sections.map(sec => {
          const info = subskillLabel(attempt.quiz_key as never, sec.subskill);
          // Group items by exercise type for one instruction per block
          const typeGroups: { type: ExerciseType; items: Exercise[] }[] = [];
          sec.items.forEach(it => {
            const last = typeGroups[typeGroups.length - 1];
            if (last && last.type === it.type) last.items.push(it);
            else typeGroups.push({ type: it.type, items: [it] });
          });
          return (
            <div key={sec.subskill} className="ws-section mb-6">
              <div className="bg-gray-100 print:bg-gray-100 rounded-lg px-3 py-2 mb-3">
                <p className="font-bold text-sm">📌 {info?.thaiLabel ?? sec.subskill} <span className="font-normal text-gray-500">({info?.englishLabel ?? ''})</span></p>
                {info?.weakTip && <p className="text-xs text-gray-600 mt-0.5">💡 {info.weakTip}</p>}
              </div>
              {typeGroups.map(g => (
                <div key={g.type} className="mb-4">
                  <p className="text-sm font-semibold mb-2 italic">✏️ {EXERCISE_TYPE_INSTRUCTIONS[g.type]}</p>
                  <div className="space-y-3 pl-1">
                    {g.items.map(it => {
                      runningNo += 1;
                      const needsLine = g.type === 'rewrite_negative' || g.type === 'rewrite_question' || g.type === 'unscramble' || g.type === 'correct_mistake';
                      return (
                        <div key={it.id} className="text-sm leading-relaxed">
                          <p><b>{runningNo}.</b> {it.prompt}</p>
                          {needsLine && <p className="mt-1 ml-5 text-gray-300 select-none">__________________________________________________</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* ── Answer key (new printed page) ── */}
        <div className="answer-key border-t-4 border-double border-gray-400 pt-5 mt-8">
          <p className="text-lg font-black mb-1">🔑 เฉลยสำหรับครู — {set.thaiLabel}</p>
          <p className="text-xs text-gray-500 mb-4">น้อง{student?.nickname} · ใบงานเสริมจาก Quiz วันที่ {thDate}</p>
          {(() => {
            let keyNo = 0;
            return sections.map(sec => {
              const info = subskillLabel(attempt.quiz_key as never, sec.subskill);
              return (
                <div key={sec.subskill} className="mb-4">
                  <p className="text-sm font-bold mb-1.5">📌 {info?.thaiLabel ?? sec.subskill}</p>
                  <div className="text-sm space-y-1 pl-1">
                    {sec.items.map(it => {
                      keyNo += 1;
                      return <p key={it.id}><b>{keyNo}.</b> {it.answer}</p>;
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </main>
  );
}
