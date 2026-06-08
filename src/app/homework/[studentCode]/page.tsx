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
    await fetchAssignments(stu);
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
              {submitted.map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-amber-100 p-4 flex items-center gap-3">
                  <span className="text-2xl">📬</span>
                  <div>
                    <p className="font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-400">
                      ส่งแล้ว {new Date(a.submission!.submitted_at).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>
              ))}
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
