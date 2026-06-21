'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/supabase';
import type { Assignment, Student } from '@/lib/db';

export default function TeacherHubPage() {
  const [pendingHomework, setPendingHomework] = useState<number | null>(null);
  const [pendingMakeup, setPendingMakeup] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submittedSet, setSubmittedSet] = useState<Set<string>>(new Set());
  const [missingView, setMissingView] = useState<'assignment' | 'student'>('assignment');
  const [loadingMissing, setLoadingMissing] = useState(true);

  useEffect(() => {
    loadStats();
    loadMissingData();
  }, []);

  async function loadStats() {
    const [hwRes, mkRes] = await Promise.all([
      db().from('homework_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db().from('makeup_classes').select('*', { count: 'exact', head: true }).eq('completed', false),
    ]);
    setPendingHomework(hwRes.count ?? 0);
    setPendingMakeup(mkRes.count ?? 0);
  }

  async function loadMissingData() {
    setLoadingMissing(true);
    const [aRes, sRes, subRes] = await Promise.all([
      db().from('assignments').select('*').eq('is_active', true).order('due_date', { ascending: true, nullsFirst: false }),
      db().from('students').select('*').eq('is_active', true).order('nickname'),
      db().from('homework_submissions').select('student_id, assignment_id'),
    ]);
    setAssignments((aRes.data ?? []) as Assignment[]);
    setStudents((sRes.data ?? []) as Student[]);
    const set = new Set<string>();
    (subRes.data ?? []).forEach((s: { student_id: string; assignment_id: string }) => {
      set.add(`${s.student_id}::${s.assignment_id}`);
    });
    setSubmittedSet(set);
    setLoadingMissing(false);
  }

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

  const now = new Date();
  const isOverdue = (a: Assignment) => a.due_date != null && new Date(a.due_date) < now;

  const totalMissing = useMemo(() => {
    let n = 0;
    assignmentMissingMap.forEach(arr => { n += arr.length; });
    return n;
  }, [assignmentMissingMap]);

  const assignmentsWithMissing = assignments.filter(a => assignmentMissingMap.has(a.id));
  const studentsWithMissing = students.filter(s => studentMissingMap.has(s.id));

  function formatDue(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  }

  const tools = [
    { href: '/teacher/homework',   icon: '📝', label: 'ตรวจการบ้าน',       desc: 'ดูงานที่ส่งและให้คะแนน Feedback',                badge: pendingHomework, color: 'border-amber-100 hover:border-amber-300' },
    { href: '/teacher/assignments',icon: '📚', label: 'สร้าง Assignment',   desc: 'สร้างและจัดการงานที่มอบหมาย',                    badge: null,            color: 'border-blue-100 hover:border-blue-300' },
    { href: '/teacher/courses',    icon: '📚', label: 'คอร์ส',              desc: 'สร้างและจัดการคอร์สเรียน',                       badge: null,            color: 'border-teal-100 hover:border-teal-300' },
    { href: '/teacher/attendance', icon: '📅', label: 'Sessions',           desc: 'เช็คชื่อ อัปวิดีโอ สรุปคาบ และ Feedback รายบุคคล', badge: null,         color: 'border-green-100 hover:border-green-300' },
    { href: '/teacher/makeup',     icon: '🔁', label: 'Make-up Classes',    desc: 'ติดตามและจัดการชั่วโมงเรียนชดเชย',               badge: pendingMakeup,   color: 'border-red-100 hover:border-red-300' },
    { href: '/teacher/students',   icon: '👥', label: 'นักเรียน',           desc: 'เพิ่มและจัดการข้อมูลผู้เรียน',                   badge: null,            color: 'border-purple-100 hover:border-purple-300' },
    { href: '/teacher/inclass',    icon: '⭐', label: 'ประเมินระหว่างคาบ',  desc: 'ให้ดาว ติด Tag พฤติกรรม โน้ตระหว่างสอน',         badge: null,            color: 'border-yellow-100 hover:border-yellow-300' },
    { href: '/dashboard',          icon: '📊', label: 'ผลสอบวัดระดับ',      desc: 'ดูผลและวิเคราะห์ทักษะรายคน',                     badge: null,            color: 'border-teal-100 hover:border-teal-300' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b px-4 py-5">
        <div className="max-w-6xl mx-auto">
          <a href="/hub" className="text-sm text-gray-400 hover:text-gray-600">← หน้าหลัก</a>
          <div className="mt-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white text-xl font-black">E</div>
            <div>
              <h1 className="text-xl font-black text-gray-900">ENG SPARK</h1>
              <p className="text-sm text-gray-500">ระบบจัดการครู</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">

          {/* ─── LEFT: Stats + Tool cards ─── */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-amber-500">
                  {pendingHomework === null ? '—' : pendingHomework}
                </p>
                <p className="text-xs text-amber-500 mt-1">การบ้านรอตรวจ</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-red-500">
                  {pendingMakeup === null ? '—' : pendingMakeup}
                </p>
                <p className="text-xs text-red-400 mt-1">Make-up คงค้าง</p>
              </div>
            </div>

            {/* Tool cards */}
            <div className="space-y-2">
              {tools.map(t => (
                <a key={t.href} href={t.href}
                  className={`flex items-center gap-4 bg-white rounded-2xl shadow-sm border-2 p-4 transition-colors ${t.color}`}>
                  <span className="text-3xl w-12 h-12 flex items-center justify-center shrink-0">{t.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {t.label}
                      {t.badge != null && t.badge > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px]">
                          {t.badge}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400">{t.desc}</p>
                  </div>
                  <span className="text-gray-300 shrink-0">→</span>
                </a>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Missing homework panel ─── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:sticky lg:top-4">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📌</span>
                <h2 className="font-bold text-gray-800">ยังไม่ส่งการบ้าน</h2>
                {!loadingMissing && totalMissing > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalMissing}
                  </span>
                )}
              </div>
              <a href="/teacher/missing" className="text-xs text-blue-500 hover:text-blue-700 shrink-0">
                ดูทั้งหมด →
              </a>
            </div>

            {/* Tabs */}
            <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-gray-50">
              <button onClick={() => setMissingView('assignment')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${missingView === 'assignment' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                แยกตาม Assignment
              </button>
              <button onClick={() => setMissingView('student')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${missingView === 'student' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                แยกตามนักเรียน
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              {loadingMissing ? (
                <div className="py-12 text-center text-gray-400 text-sm">กำลังโหลด...</div>

              ) : missingView === 'assignment' ? (
                assignmentsWithMissing.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-sm font-medium">ทุกคนส่งการบ้านครบแล้ว!</p>
                  </div>
                ) : (
                  assignmentsWithMissing.map(a => {
                    const missing = assignmentMissingMap.get(a.id) ?? [];
                    const overdue = isOverdue(a);
                    return (
                      <div key={a.id} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{a.title}</p>
                            {a.due_date ? (
                              <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                {overdue ? '🔴 เลยกำหนด · ' : '📅 '}{formatDue(a.due_date)}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-300 mt-0.5">ไม่มีกำหนดส่ง</p>
                            )}
                          </div>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
                            {missing.length} คน
                          </span>
                        </div>
                        <div className="px-3 py-2 flex flex-wrap gap-1.5">
                          {missing.map(s => (
                            <a key={s.id} href={`/teacher/students/${s.id}`}
                              className="flex items-center gap-1 bg-white border border-gray-200 hover:border-blue-300 rounded-full px-2 py-0.5 text-xs transition-colors">
                              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {s.nickname[0]}
                              </span>
                              <span className="text-gray-700">{s.nickname}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )

              ) : (
                studentsWithMissing.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-sm font-medium">ทุกคนส่งการบ้านครบแล้ว!</p>
                  </div>
                ) : (
                  studentsWithMissing.map(s => {
                    const missing = studentMissingMap.get(s.id) ?? [];
                    return (
                      <div key={s.id} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50">
                          <a href={`/teacher/students/${s.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {s.nickname[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800">
                                {s.nickname}
                                {s.full_name && (
                                  <span className="text-xs text-gray-400 ml-1">({s.full_name})</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400">{s.grade}</p>
                            </div>
                          </a>
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
                            ค้าง {missing.length}
                          </span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {missing.map(a => {
                            const overdue = isOverdue(a);
                            return (
                              <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                                <p className="text-xs text-gray-700 flex-1 truncate">{a.title}</p>
                                {a.due_date && (
                                  <span className={`text-[10px] shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                    {overdue ? '🔴 ' : '📅 '}{formatDue(a.due_date)}
                                  </span>
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
          </div>

        </div>
      </div>
    </main>
  );
}
