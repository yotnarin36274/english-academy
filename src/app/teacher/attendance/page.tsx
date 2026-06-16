'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, ClassSession, Course } from '@/lib/db';

export default function SessionsPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creatingForCourse, setCreatingForCourse] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTopic, setFormTopic] = useState('');
  const [formHours, setFormHours] = useState('1.5');
  const [formWeek, setFormWeek] = useState('');
  const [formExtraStudentIds, setFormExtraStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('teacher_auth') !== '1') {
      router.replace('/teacher');
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    const [{ data: cData }, { data: sData }, { data: stuData }] = await Promise.all([
      db().from('courses').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      db().from('class_sessions').select('*').order('session_date', { ascending: false }),
      db().from('students').select('*').eq('is_active', true).order('nickname'),
    ]);
    setCourses((cData ?? []) as Course[]);
    setSessions((sData ?? []) as ClassSession[]);
    setAllStudents((stuData ?? []) as Student[]);
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function openCreateForm(courseId: string) {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTopic('');
    setFormHours('1.5');
    setFormWeek('');
    setFormExtraStudentIds([]);
    setCreatingForCourse(courseId);
    setExpandedIds(prev => new Set([...prev, courseId]));
  }

  async function createSession(course: Course) {
    if (!formDate || !formTopic.trim()) return;
    setCreating(true);
    const studentIds = [...new Set([...course.student_ids, ...formExtraStudentIds])];
    const { data } = await db().from('class_sessions').insert({
      session_date: formDate,
      topic: formTopic.trim(),
      subject: course.subject,
      course_id: course.id,
      duration_hours: parseFloat(formHours) || 1.5,
      week_number: formWeek ? parseInt(formWeek) : null,
      group_key: null,
      student_ids: studentIds,
    }).select().single();
    setCreating(false);
    if (data) {
      setCreatingForCourse(null);
      router.push(`/teacher/session/${(data as ClassSession).id}`);
    }
  }

  async function deleteSession(id: string) {
    if (!window.confirm('ลบ Session นี้?\n(ข้อมูลเช็คชื่อและ Make-up จะถูกลบด้วย)')) return;
    setDeletingId(id);
    const { data: attRows } = await db().from('attendance').select('id').eq('session_id', id);
    if (attRows?.length) {
      await db().from('makeup_classes').delete().in('attendance_id', (attRows as { id: string }[]).map(a => a.id));
    }
    await db().from('attendance').delete().eq('session_id', id);
    await db().from('session_reports').delete().eq('session_id', id);
    await db().from('class_sessions').delete().eq('id', id);
    setDeletingId(null);
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  const sessionsByCourse = new Map<string, ClassSession[]>();
  const legacySessions: ClassSession[] = [];
  for (const s of sessions) {
    if (s.course_id) {
      if (!sessionsByCourse.has(s.course_id)) sessionsByCourse.set(s.course_id, []);
      sessionsByCourse.get(s.course_id)!.push(s);
    } else {
      legacySessions.push(s);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600">←</a>
            <h1 className="text-lg font-bold text-gray-800">📅 Sessions</h1>
          </div>
          <a href="/teacher/courses"
            className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors font-medium">
            📚 จัดการคอร์ส
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-3">

        {courses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📚</div>
            <p className="font-medium text-gray-500">ยังไม่มีคอร์ส</p>
            <p className="text-sm mt-1 mb-4">สร้างคอร์สก่อน แล้วค่อยสร้าง Session ครับ</p>
            <a href="/teacher/courses"
              className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700">
              📚 สร้างคอร์สแรก →
            </a>
          </div>
        ) : courses.map(course => {
          const courseSessions = (sessionsByCourse.get(course.id) ?? []);
          const expanded = expandedIds.has(course.id);
          const isCreating = creatingForCourse === course.id;
          const extraPool = allStudents.filter(s => !course.student_ids.includes(s.id));

          return (
            <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Course header */}
              <button onClick={() => toggleExpand(course.id)} className="w-full text-left p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {course.subject && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{course.subject}</span>
                      )}
                      <span className="font-bold text-gray-800">{course.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {courseSessions.length} sessions
                      {course.total_hours > 0 && ` · ${course.total_hours} ชม./คอร์ส`}
                      {` · ${course.student_ids.length} นักเรียน`}
                    </p>
                  </div>
                  <span className="text-gray-300 shrink-0">{expanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded && (
                <>
                  {courseSessions.length === 0 && !isCreating && (
                    <div className="border-t border-gray-50 px-4 py-5 text-center">
                      <p className="text-sm text-gray-400">ยังไม่มี Session ในคอร์สนี้</p>
                    </div>
                  )}

                  {/* Session list */}
                  {courseSessions.map(s => (
                    <div key={s.id} className="border-t border-gray-50 flex items-center px-4 py-3 gap-2 hover:bg-gray-50 group">
                      <a href={`/teacher/session/${s.id}`} className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 text-xs w-14 shrink-0">
                          {new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </span>
                        {s.week_number != null && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">สป.{s.week_number}</span>
                        )}
                        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{s.topic}</span>
                        <span className="text-xs text-gray-400 shrink-0">{s.duration_hours} ชม.</span>
                        <span className="text-blue-300 shrink-0 text-sm">→</span>
                      </a>
                      <button onClick={() => deleteSession(s.id)} disabled={deletingId === s.id}
                        className="shrink-0 text-xs px-2 py-1 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50">
                        {deletingId === s.id ? '...' : '🗑️'}
                      </button>
                    </div>
                  ))}

                  {/* Create session form */}
                  {isCreating ? (
                    <div className="border-t border-gray-100 p-4 bg-gray-50/80 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">+ สร้าง Session ใน &ldquo;{course.name}&rdquo;</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600">วันที่สอน *</label>
                          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">สัปดาห์ที่</label>
                          <input type="number" min="1" max="52" value={formWeek}
                            onChange={e => setFormWeek(e.target.value)} placeholder="เช่น 3"
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600">หัวข้อที่สอน *</label>
                        <input value={formTopic} onChange={e => setFormTopic(e.target.value)}
                          placeholder="เช่น Present Simple, รากที่ 2 + สมการ"
                          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                      </div>

                      <div className="w-40">
                        <label className="text-xs font-medium text-gray-600">ระยะเวลา (ชม.)</label>
                        <input type="number" step="0.5" min="0.5" max="8" value={formHours}
                          onChange={e => setFormHours(e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                      </div>

                      {/* Extra students (not enrolled in course) */}
                      {extraPool.length > 0 && (
                        <div>
                          <label className="text-xs font-medium text-gray-600">
                            เพิ่มผู้เรียนรายครั้ง
                            {formExtraStudentIds.length > 0 && <span className="text-blue-600 ml-1">({formExtraStudentIds.length} คน)</span>}
                          </label>
                          <p className="text-xs text-gray-400 mb-1">นักเรียนนอกเหนือจากที่ลงทะเบียนในคอร์ส</p>
                          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-32 overflow-y-auto bg-white">
                            {extraPool.map(s => (
                              <button key={s.id}
                                onClick={() => setFormExtraStudentIds(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b border-gray-50 last:border-0 text-sm transition-colors ${formExtraStudentIds.includes(s.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${formExtraStudentIds.includes(s.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                  {formExtraStudentIds.includes(s.id) && <span className="text-white text-[9px] leading-none">✓</span>}
                                </div>
                                <span className="font-medium text-gray-800">{s.nickname}</span>
                                <span className="text-xs text-gray-400">{s.grade}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setCreatingForCourse(null)}
                          className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                          ยกเลิก
                        </button>
                        <button onClick={() => createSession(course)}
                          disabled={!formDate || !formTopic.trim() || creating}
                          className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                          {creating ? 'กำลังสร้าง...' : '✅ สร้าง Session'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-gray-50 p-3">
                      <button onClick={() => openCreateForm(course.id)}
                        className="w-full py-2 text-sm text-blue-600 font-semibold hover:bg-blue-50 rounded-xl transition-colors">
                        + สร้าง Session ใหม่
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Legacy sessions (no course_id) */}
        {legacySessions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => toggleExpand('__legacy')} className="w-full text-left p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600">📋 Sessions เดิม (ไม่มีคอร์ส)</p>
                  <p className="text-xs text-gray-400 mt-0.5">{legacySessions.length} sessions</p>
                </div>
                <span className="text-gray-300">{expandedIds.has('__legacy') ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedIds.has('__legacy') && legacySessions.map(s => (
              <a key={s.id} href={`/teacher/session/${s.id}`}
                className="flex items-center gap-2 px-4 py-3 border-t border-gray-50 hover:bg-gray-50 transition-colors">
                {s.subject && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium shrink-0">{s.subject}</span>
                )}
                <span className="text-gray-400 text-xs w-14 shrink-0">
                  {new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{s.topic}</span>
                <span className="text-xs text-gray-400 shrink-0">{s.duration_hours} ชม.</span>
                <span className="text-blue-300 shrink-0">→</span>
              </a>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
