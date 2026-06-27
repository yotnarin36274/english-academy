'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/supabase';
import type { Assignment, Student, HomeworkSubmission } from '@/lib/db';

const GROUP_LABELS: Record<string, string> = { p46: 'ป.4–ป.6', m13: 'ม.1–ม.3', m46: 'ม.4–ม.6' };

type View = 'assignment' | 'student' | 'course' | 'session';
const VIEWS: { id: View; label: string }[] = [
  { id: 'assignment', label: 'Assignment' },
  { id: 'student',   label: 'นักเรียน' },
  { id: 'course',    label: 'คอร์ส' },
  { id: 'session',   label: 'Session' },
];

export default function MissingHomeworkPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Pick<HomeworkSubmission, 'student_id' | 'assignment_id'>[]>([]);
  const [courseMap, setCourseMap] = useState<Map<string, string>>(new Map());
  const [sessionMap, setSessionMap] = useState<Map<string, { topic: string; session_date: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('assignment');
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [aRes, sRes, subRes] = await Promise.all([
      db().from('assignments').select('*').eq('is_active', true).order('due_date', { ascending: true, nullsFirst: false }),
      db().from('students').select('*').eq('is_active', true).order('nickname'),
      db().from('homework_submissions').select('student_id, assignment_id'),
    ]);

    const asgns = (aRes.data ?? []) as Assignment[];
    setAssignments(asgns);
    setStudents((sRes.data ?? []) as Student[]);
    setSubmissions(subRes.data ?? []);

    // Load course and session names referenced by assignments
    const courseIds = [...new Set(asgns.map(a => a.course_id).filter(Boolean))] as string[];
    const sessionIds = [...new Set(asgns.map(a => a.session_id).filter(Boolean))] as string[];

    const [cRes, srRes] = await Promise.all([
      courseIds.length ? db().from('courses').select('id, name').in('id', courseIds) : { data: [] },
      sessionIds.length ? db().from('class_sessions').select('id, topic, session_date').in('id', sessionIds) : { data: [] },
    ]);

    const cm = new Map<string, string>();
    (cRes.data ?? []).forEach((c: { id: string; name: string }) => cm.set(c.id, c.name));
    setCourseMap(cm);

    const sm = new Map<string, { topic: string; session_date: string }>();
    (srRes.data ?? []).forEach((s: { id: string; topic: string; session_date: string }) => sm.set(s.id, s));
    setSessionMap(sm);

    setLoading(false);
  }

  const submittedSet = useMemo(() => {
    const s = new Set<string>();
    submissions.forEach(sub => s.add(`${sub.student_id}::${sub.assignment_id}`));
    return s;
  }, [submissions]);

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

  const studentMissingMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    students.forEach(s => {
      const missing = assignments.filter(a => {
        let targeted = false;
        if (a.target_student_ids?.length > 0) targeted = a.target_student_ids.includes(s.id);
        else if (a.target_groups?.length > 0) targeted = a.target_groups.includes(s.group_key);
        else targeted = true;
        return targeted && !submittedSet.has(`${s.id}::${a.id}`);
      });
      if (missing.length > 0) map.set(s.id, missing);
    });
    return map;
  }, [assignments, students, submittedSet]);

  // Group assignments by course
  const courseGroups = useMemo(() => {
    const map = new Map<string, { label: string; assignments: Assignment[] }>();
    assignments.forEach(a => {
      if (!assignmentMissingMap.has(a.id)) return;
      const key = a.course_id ?? '__none__';
      const label = a.course_id ? (courseMap.get(a.course_id) ?? 'คอร์สไม่พบชื่อ') : 'ไม่ได้ระบุคอร์ส';
      if (!map.has(key)) map.set(key, { label, assignments: [] });
      map.get(key)!.assignments.push(a);
    });
    return [...map.entries()].sort(([a], [b]) => a === '__none__' ? 1 : b === '__none__' ? -1 : 0);
  }, [assignments, assignmentMissingMap, courseMap]);

  // Group assignments by session
  const sessionGroups = useMemo(() => {
    const map = new Map<string, { label: string; date: string | null; assignments: Assignment[] }>();
    assignments.forEach(a => {
      if (!assignmentMissingMap.has(a.id)) return;
      const key = a.session_id ?? '__none__';
      const sess = a.session_id ? sessionMap.get(a.session_id) : null;
      const label = sess ? sess.topic : 'ไม่ได้ระบุ Session';
      const date = sess ? sess.session_date : null;
      if (!map.has(key)) map.set(key, { label, date, assignments: [] });
      map.get(key)!.assignments.push(a);
    });
    // Sort: sessions with dates first (newest first), then no-session last
    return [...map.entries()].sort(([ak, av], [bk, bv]) => {
      if (ak === '__none__') return 1;
      if (bk === '__none__') return -1;
      return (bv.date ?? '').localeCompare(av.date ?? '');
    });
  }, [assignments, assignmentMissingMap, sessionMap]);

  const now = new Date();
  const isOverdue = (a: Assignment) => a.due_date != null && new Date(a.due_date) < now;

  const totalMissing = useMemo(() => {
    let n = 0;
    assignmentMissingMap.forEach(arr => { n += arr.length; });
    return n;
  }, [assignmentMissingMap]);

  function formatDue(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  function formatSessionDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
  }

  // Shared: render assignment row inside a group
  function AssignmentRow({ a }: { a: Assignment }) {
    const missing = assignmentMissingMap.get(a.id) ?? [];
    const overdue = isOverdue(a);
    if (overdueOnly && !overdue) return null;
    return (
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-3 py-2.5 bg-gray-50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{a.title}</p>
            {a.due_date ? (
              <p className={`text-xs mt-0.5 font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                {overdue ? '🔴 เลยกำหนด · ' : '📅 '}{formatDue(a.due_date)}
              </p>
            ) : (
              <p className="text-xs text-gray-300 mt-0.5">ไม่มีกำหนดส่ง</p>
            )}
          </div>
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
            {missing.length} คน
          </span>
        </div>
        <div className="px-3 py-2 flex flex-wrap gap-1.5">
          {missing.map(s => (
            <a key={s.id} href={`/teacher/students/${s.id}`}
              className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-blue-300 rounded-full px-2.5 py-1 text-sm transition-colors">
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
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;
  }

  const isEmpty = totalMissing === 0;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600 text-lg">←</a>
            <h1 className="text-lg font-bold text-gray-800">📌 ยังไม่ส่งการบ้าน</h1>
            {totalMissing > 0 && (
              <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                {totalMissing} รายการ
              </span>
            )}
          </div>

          <div className="flex gap-2 mb-2.5 overflow-x-auto pb-0.5">
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${view === v.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {v.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)}
              className="rounded accent-red-500" />
            แสดงเฉพาะที่เลยกำหนดส่งแล้ว
          </label>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4 space-y-4">

        {/* ── Empty state ── */}
        {isEmpty && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-medium">ทุกคนส่งการบ้านครบแล้ว!</p>
          </div>
        )}

        {/* ── VIEW: by Assignment ── */}
        {!isEmpty && view === 'assignment' && assignments
          .filter(a => {
            const m = assignmentMissingMap.get(a.id) ?? [];
            return m.length > 0 && (overdueOnly ? isOverdue(a) : true);
          })
          .map(a => {
            const missing = assignmentMissingMap.get(a.id) ?? [];
            const overdue = isOverdue(a);
            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{a.title}</p>
                      {a.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>}
                      {a.due_date ? (
                        <p className={`text-xs mt-1 font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                          {overdue ? '🔴 เลยกำหนด · ' : '📅 กำหนดส่ง '}{formatDue(a.due_date)}
                        </p>
                      ) : <p className="text-xs text-gray-300 mt-1">ไม่มีกำหนดส่ง</p>}
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
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{s.nickname[0]}</span>
                      <span className="text-gray-700">{s.nickname}</span>
                      <span className="text-gray-400 text-xs">{s.grade}</span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })
        }

        {/* ── VIEW: by Student ── */}
        {!isEmpty && view === 'student' && students
          .filter(s => {
            const m = studentMissingMap.get(s.id) ?? [];
            return m.length > 0 && (overdueOnly ? m.some(a => isOverdue(a)) : true);
          })
          .map(s => {
            const allMissing = studentMissingMap.get(s.id) ?? [];
            const missing = overdueOnly ? allMissing.filter(a => isOverdue(a)) : allMissing;
            return (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <a href={`/teacher/students/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">{s.nickname[0]}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">
                          {s.nickname}
                          {s.full_name && <span className="text-xs text-gray-400 ml-1.5">({s.full_name})</span>}
                        </p>
                        <p className="text-xs text-gray-400">{s.grade} · {GROUP_LABELS[s.group_key] ?? s.group_key}</p>
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
                        ) : <span className="text-xs text-gray-300 shrink-0">ไม่มีกำหนด</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        }

        {/* ── VIEW: by Course ── */}
        {!isEmpty && view === 'course' && (
          courseGroups.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-medium">ไม่มี assignment ที่ค้างส่ง</p>
            </div>
          ) : (
            courseGroups.map(([key, { label, assignments: groupAsgns }]) => {
              const visibleAsgns = groupAsgns.filter(a => overdueOnly ? isOverdue(a) : true);
              if (visibleAsgns.length === 0) return null;
              const totalInGroup = visibleAsgns.reduce((n, a) => n + (assignmentMissingMap.get(a.id)?.length ?? 0), 0);
              return (
                <div key={key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Course header */}
                  <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-500 text-lg">📚</span>
                      <p className="font-bold text-indigo-800">{label}</p>
                      {key === '__none__' && <span className="text-xs text-indigo-400">(ไม่ได้ผูกกับคอร์ส)</span>}
                    </div>
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                      {totalInGroup} คน-ชิ้น
                    </span>
                  </div>
                  {/* Assignments inside this course */}
                  <div className="p-3 space-y-2">
                    {visibleAsgns.map(a => <AssignmentRow key={a.id} a={a} />)}
                  </div>
                </div>
              );
            })
          )
        )}

        {/* ── VIEW: by Session ── */}
        {!isEmpty && view === 'session' && (
          sessionGroups.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-medium">ไม่มี assignment ที่ค้างส่ง</p>
            </div>
          ) : (
            sessionGroups.map(([key, { label, date, assignments: groupAsgns }]) => {
              const visibleAsgns = groupAsgns.filter(a => overdueOnly ? isOverdue(a) : true);
              if (visibleAsgns.length === 0) return null;
              const totalInGroup = visibleAsgns.reduce((n, a) => n + (assignmentMissingMap.get(a.id)?.length ?? 0), 0);
              return (
                <div key={key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Session header */}
                  <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-teal-500 text-lg shrink-0">📅</span>
                      <div className="min-w-0">
                        <p className="font-bold text-teal-800 truncate">{label}</p>
                        {date && (
                          <p className="text-xs text-teal-500">{formatSessionDate(date)}</p>
                        )}
                        {key === '__none__' && <p className="text-xs text-teal-400">ไม่ได้ผูกกับ Session</p>}
                      </div>
                    </div>
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                      {totalInGroup} คน-ชิ้น
                    </span>
                  </div>
                  {/* Assignments inside this session */}
                  <div className="p-3 space-y-2">
                    {visibleAsgns.map(a => <AssignmentRow key={a.id} a={a} />)}
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
