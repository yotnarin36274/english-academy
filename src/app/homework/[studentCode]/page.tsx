'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, Assignment, HomeworkSubmission, FeedbackRow } from '@/lib/db';

interface AssignmentWithStatus extends Assignment {
  submission: HomeworkSubmission | null;
  feedback: FeedbackRow | null;
}

export default function StudentHomeworkPage() {
  const { studentCode } = useParams<{ studentCode: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{id: string; session_date: string; topic: string; duration_hours: number; status: string}>>([]);
  const [makeups, setMakeups] = useState<Array<{id: string; topic: string; duration_hours: number}>>([]);
  const [attendedHours, setAttendedHours] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadData();
    return () => { channelRef.current?.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode]);

  async function loadData() {
    const { data: stu } = await db()
      .from('students')
      .select('*')
      .eq('student_code', studentCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (!stu) { router.replace('/homework'); return; }
    setStudent(stu);
    await Promise.all([fetchAssignments(stu), fetchSessionData(stu)]);
    setLoading(false);

    // Subscribe realtime
    if (!channelRef.current) {
      channelRef.current = db()
        .channel(`student-hw-${stu.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `student_id=eq.${stu.id}` },
          () => fetchAssignments(stu))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions', filter: `student_id=eq.${stu.id}` },
          () => fetchAssignments(stu))
        .subscribe();
    }
  }

  async function fetchAssignments(stu: Student) {
    const { data: asgList } = await db()
      .from('assignments')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const filtered = (asgList ?? []).filter((a: Assignment) => {
      const noTarget = a.target_groups.length === 0 && (a.target_student_ids ?? []).length === 0;
      return noTarget
        || a.target_groups.includes(stu.group_key)
        || (a.target_student_ids ?? []).includes(stu.id);
    });

    const { data: subsData } = await db()
      .from('homework_submissions')
      .select('*')
      .eq('student_id', stu.id);

    const { data: fbData } = await db()
      .from('feedback')
      .select('*')
      .eq('student_id', stu.id);

    const subMap = new Map<string, HomeworkSubmission>();
    (subsData ?? []).forEach((s: HomeworkSubmission) => subMap.set(s.assignment_id, s));

    const fbBySubId = new Map<string, FeedbackRow>();
    (fbData ?? []).forEach((f: FeedbackRow) => fbBySubId.set(f.submission_id, f));

    const merged: AssignmentWithStatus[] = filtered.map((a: Assignment) => {
      const sub = subMap.get(a.id) ?? null;
      const fb = sub ? fbBySubId.get(sub.id) ?? null : null;
      return { ...a, submission: sub, feedback: fb };
    });

    setAssignments(merged);
    setRefreshing(false);
  }

  async function fetchSessionData(stu: Student) {
    const { data: attData } = await db()
      .from('attendance').select('status, session_id').eq('student_id', stu.id);
    if (!attData?.length) { setSessions([]); setAttendedHours(0); setMakeups([]); return; }

    const sessionIds = (attData as {status: string; session_id: string}[]).map(a => a.session_id);
    const { data: sessionData } = await db()
      .from('class_sessions').select('id, session_date, topic, duration_hours')
      .in('id', sessionIds).order('session_date', { ascending: false });

    const sMap = new Map((sessionData ?? []).map((s: {id: string; session_date: string; topic: string; duration_hours: number}) => [s.id, s]));
    const merged = (attData as {status: string; session_id: string}[])
      .map(a => { const s = sMap.get(a.session_id); return s ? { ...s, status: a.status } : null; })
      .filter(Boolean) as {id: string; session_date: string; topic: string; duration_hours: number; status: string}[];
    merged.sort((a, b) => b.session_date.localeCompare(a.session_date));
    setSessions(merged);

    const hours = (attData as {status: string; session_id: string}[])
      .filter(a => a.status === 'present')
      .reduce((sum, a) => sum + (sMap.get(a.session_id)?.duration_hours ?? 0), 0);
    setAttendedHours(hours);

    const { data: mkData } = await db()
      .from('makeup_classes').select('id, topic, duration_hours')
      .eq('student_id', stu.id).eq('completed', false);
    setMakeups((mkData ?? []) as {id: string; topic: string; duration_hours: number}[]);
  }

  async function withdrawSubmission(assignmentId: string, submissionId: string) {
    setWithdrawing(assignmentId);
    await db().from('homework_submissions').delete().eq('id', submissionId);
    router.push(`/homework/${studentCode}/submit/${assignmentId}?resubmit=1`);
  }

  const today = new Date().toISOString().split('T')[0];
  const pending = assignments.filter(a => !a.submission);
  const submitted = assignments.filter(a => a.submission && !a.feedback);
  const reviewed = assignments.filter(a => a.feedback);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm">ENG SPARK ⚡</p>
              <h1 className="text-xl font-bold mt-0.5">สวัสดีน้อง{student?.nickname} 👋</h1>
              <p className="text-blue-100 text-sm mt-0.5">{student?.grade} · รหัส {studentCode}</p>
            </div>
            <button
              onClick={() => { setRefreshing(true); if (student) fetchAssignments(student); }}
              disabled={refreshing}
              className="mt-1 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {refreshing ? '...' : '🔄 รีเฟรช'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-6">
        {/* Session history */}
        {(student.total_course_hours || sessions.length > 0 || makeups.length > 0) && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">📅 ชั่วโมงเรียน</h2>

            {student.session_type === 'fixed' && student.total_course_hours ? (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">เรียนแล้ว <span className="font-semibold text-gray-800">{attendedHours} ชม.</span></span>
                  <span className="font-semibold text-blue-600">เหลือ {Math.max(0, student.total_course_hours - attendedHours)} ชม.</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (attendedHours / student.total_course_hours) * 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{attendedHours}/{student.total_course_hours} ชม.</p>
              </div>
            ) : attendedHours > 0 ? (
              <p className="text-sm text-gray-600">รวมเรียน <span className="font-semibold text-gray-800">{attendedHours} ชม.</span></p>
            ) : null}

            {makeups.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-600 mb-1.5">🔁 Make-up คงค้าง ({makeups.length})</p>
                {makeups.map(m => (
                  <div key={m.id} className="text-xs bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5 text-orange-700 mb-1">
                    {m.topic} · {m.duration_hours} ชม.
                  </div>
                ))}
              </div>
            )}

            {sessions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">📋 ประวัติการเรียน</p>
                <div className="space-y-1">
                  {sessions.slice(0, 6).map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
                      <span>{s.status === 'present' ? '✅' : s.status === 'absent' ? '❌' : '🤒'}</span>
                      <span className="text-gray-400 shrink-0 w-14">
                        {new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-gray-700 flex-1 truncate">{s.topic}</span>
                      <span className="text-gray-400 shrink-0">{s.duration_hours} ชม.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">
              📌 งานที่ต้องส่ง ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map(a => (
                <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-red-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{a.title}</p>
                      {a.description && <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>}
                      {a.due_date && (
                        <p className="text-xs text-red-500 mt-1">
                          ครบกำหนด: {new Date(a.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/homework/${studentCode}/submit/${a.id}`)}
                      className="shrink-0 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      ส่งงาน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Submitted / waiting */}
        {submitted.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3">
              ⏳ รอครูตรวจ ({submitted.length})
            </h2>
            <div className="space-y-2">
              {submitted.map(a => {
                const canEdit = !a.due_date || a.due_date >= today;
                return (
                  <div key={a.id} className="bg-white rounded-xl border border-amber-100 p-4 flex items-center gap-3">
                    <span className="text-2xl shrink-0">📬</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{a.title}</p>
                      <p className="text-xs text-gray-400">
                        ส่งแล้ว {new Date(a.submission!.submitted_at).toLocaleDateString('th-TH')}
                        {a.due_date && ` · ครบกำหนด ${new Date(a.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => withdrawSubmission(a.id, a.submission!.id)}
                        disabled={withdrawing === a.id}
                        className="shrink-0 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        {withdrawing === a.id ? '...' : '✏️ แก้ไขงาน'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Reviewed */}
        {reviewed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-3">
              ✅ ตรวจแล้ว ({reviewed.length})
            </h2>
            <div className="space-y-3">
              {reviewed.map(a => {
                const fb = a.feedback!;
                const pct = fb.score != null ? Math.round((fb.score / fb.max_score) * 100) : null;
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-gray-800">{a.title}</p>
                      {pct != null && (
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                          {fb.score}/{fb.max_score} ({pct}%)
                        </span>
                      )}
                    </div>
                    {fb.comment && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                        💬 {fb.comment}
                      </p>
                    )}
                    {/* Show homework images */}
                    {a.submission?.image_urls && a.submission.image_urls.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {a.submission.image_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`งาน ${i + 1}`} className="h-16 w-16 object-cover rounded-lg border" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {assignments.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p>ยังไม่มีการบ้านครับ</p>
          </div>
        )}
      </div>
    </main>
  );
}
