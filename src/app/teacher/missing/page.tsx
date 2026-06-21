'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/supabase';
import type { Assignment, Student, HomeworkSubmission } from '@/lib/db';

const GROUP_LABELS: Record<string, string> = { p46: 'ป.4–ป.6', m13: 'ม.1–ม.3', m46: 'ม.4–ม.6' };

export default function MissingHomeworkPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Pick<HomeworkSubmission, 'student_id' | 'assignment_id'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'assignment' | 'student'>('assignment');
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [aRes, sRes, subRes] = await Promise.all([
      db().from('assignments').select('*').eq('is_active', true).order('due_date', { ascending: true, nullsFirst: false }),
      db().from('students').select('*').eq('is_active', true).order('nickname'),
      db().from('homework_submissions').select('student_id, assignment_id'),
    ]);
    setAssignments((aRes.data ?? []) as Assignment[]);
    setStudents((sRes.data ?? []) as Student[]);
    setSubmissions(subRes.data ?? []);
    setLoading(false);
  }

  const submittedSet = useMemo(() => {
    const s = new Set<string>();
    submissions.forEach(sub => s.add(`${sub.student_id}::${sub.assignment_id}`));
    return s;
  }, [submissions]);

  // Precompute: for each assignment → missing students
  const assignmentMissingMap = useMemo(() => {
    const map = new Map<string, Student[]>();
    assignments.forEach(a => {
      let targeted: Student[];
      if (a.target_student_ids?.length > 0) {
        targeted = students.filter(s => a.target_student_ids.includes(s.id));
      } else if (a.target_groups?.length > 0) {
        targeted = students.filter(s => a.target_groups.includes(s.group_key));
      } else {
        targeted = students;
      }
      const missing = targeted.filter(s => !submittedSet.has(`${s.id}::${a.id}`));
      if (missing.length > 0) map.set(a.id, missing);
    });
    return map;
  }, [assignments, students, submittedSet]);

  // Precompute: for each student → missing assignments
  const studentMissingMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    students.forEach(s => {
      const missing = assignments.filter(a => {
        let targeted = false;
        if (a.target_student_ids?.length > 0) {
          targeted = a.target_student_ids.includes(s.id);
        } else if (a.target_groups?.length > 0) {
          targeted = a.target_groups.includes(s.group_key);
        } else {
          targeted = true;
        }
        return targeted && !submittedSet.has(`${s.id}::${a.id}`);
      });
      if (missing.length > 0) map.set(s.id, missing);
    });
    return map;
  }, [assignments, students, submittedSet]);

  const now = new Date();
  const isOverdue = (a: Assignment) => a.due_date != null && new Date(a.due_date) < now;

  const totalMissing = useMemo(() => {
    let n = 0;
    assignmentMissingMap.forEach(arr => { n += arr.length; });
    return n;
  }, [assignmentMissingMap]);

  const filteredAssignments = assignments.filter(a => {
    const missing = assignmentMissingMap.get(a.id) ?? [];
    if (missing.length === 0) return false;
    return overdueOnly ? isOverdue(a) : true;
  });

  const studentsWithMissing = students.filter(s => {
    const missing = studentMissingMap.get(s.id) ?? [];
    if (missing.length === 0) return false;
    return overdueOnly ? missing.some(a => isOverdue(a)) : true;
  });

  function formatDue(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600 text-lg">←</a>
            <h1 className="text-lg font-bold text-gray-800">📌 ยังไม่ส่งการบ้าน</h1>
            {totalMissing > 0 && (
              <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                {totalMissing} รายการ
              </span>
            )}
          </div>

          {/* View tabs */}
          <div className="flex gap-2 mb-2.5">
            <button onClick={() => setView('assignment')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${view === 'assignment' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              แยกตาม Assignment
            </button>
            <button onClick={() => setView('student')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${view === 'student' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              แยกตามนักเรียน
            </button>
          </div>

          {/* Overdue filter */}
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)}
              className="rounded accent-red-500" />
            แสดงเฉพาะที่เลยกำหนดส่งแล้ว
          </label>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4 space-y-4">

        {/* ── VIEW: by Assignment ── */}
        {view === 'assignment' && (
          filteredAssignments.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-medium">ทุกคนส่งการบ้านครบแล้ว!</p>
            </div>
          ) : (
            filteredAssignments.map(a => {
              const missing = assignmentMissingMap.get(a.id) ?? [];
              const overdue = isOverdue(a);
              return (
                <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{a.title}</p>
                        {a.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>
                        )}
                        {a.due_date ? (
                          <p className={`text-xs mt-1 font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                            {overdue ? '🔴 เลยกำหนด · ' : '📅 กำหนดส่ง '}{formatDue(a.due_date)}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-300 mt-1">ไม่มีกำหนดส่ง</p>
                        )}
                      </div>
                      <span className="bg-red-100 text-red-600 text-sm font-bold px-3 py-1 rounded-full shrink-0">
                        {missing.length} คน
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex flex-wrap gap-2">
                    {missing.map(s => (
                      <a key={s.id} href={`/teacher/students/${s.id}`}
                        className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-3 py-1 text-sm transition-colors">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {s.nickname[0]}
                        </span>
                        <span className="text-gray-700">{s.nickname}</span>
                        <span className="text-gray-400 text-xs">{s.grade}</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })
          )
        )}

        {/* ── VIEW: by Student ── */}
        {view === 'student' && (
          studentsWithMissing.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-medium">ทุกคนส่งการบ้านครบแล้ว!</p>
            </div>
          ) : (
            studentsWithMissing.map(s => {
              const allMissing = studentMissingMap.get(s.id) ?? [];
              const missing = overdueOnly ? allMissing.filter(a => isOverdue(a)) : allMissing;
              return (
                <div key={s.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-50">
                    <div className="flex items-center justify-between gap-3">
                      <a href={`/teacher/students/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                          {s.nickname[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800">
                            {s.nickname}
                            {s.full_name && (
                              <span className="text-xs text-gray-400 ml-1.5">({s.full_name})</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">
                            {s.grade} · {GROUP_LABELS[s.group_key] ?? s.group_key}
                          </p>
                        </div>
                      </a>
                      <span className="bg-red-100 text-red-600 text-sm font-bold px-3 py-1 rounded-full shrink-0">
                        ค้าง {missing.length} ชิ้น
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {missing.map(a => {
                      const overdue = isOverdue(a);
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <p className="text-sm text-gray-700 flex-1 truncate">{a.title}</p>
                          {a.due_date ? (
                            <span className={`text-xs shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              {overdue ? '🔴 ' : '📅 '}{formatDue(a.due_date)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 shrink-0">ไม่มีกำหนด</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </main>
  );
}
