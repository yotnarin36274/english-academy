'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { RadarChart } from '@/components/RadarChart';
import type { RadarAxis } from '@/components/RadarChart';
import type { Student, Assignment, HomeworkSubmission, FeedbackRow, Course } from '@/lib/db';
import { VideoPlayer } from '@/components/VideoPlayer';

interface AssignmentWithStatus extends Assignment {
  submission: HomeworkSubmission | null;
  feedback: FeedbackRow | null;
}

interface SessionReportInfo {
  id: string; session_date: string; topic: string; subject: string; duration_hours: number; status: string;
  video_urls: string[]; summary: string | null; feedback: string | null;
  attachments: { url: string; name: string }[];
}

function attIcon(name: string): string {
  const n = name.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|heic|bmp)$/.test(n)) return '🖼️';
  if (/\.pdf$/.test(n)) return '📄';
  if (/\.(mp4|mov|webm|avi|m4v|mkv)$/.test(n)) return '🎥';
  if (/\.(doc|docx)$/.test(n)) return '📝';
  return '📁';
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{part}</a>
      : part
  );
}

const SUBJECT_PALETTE = [
  { badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500', remaining: 'text-blue-600' },
  { badge: 'bg-green-100 text-green-700', bar: 'bg-green-500', remaining: 'text-green-600' },
  { badge: 'bg-purple-100 text-purple-700', bar: 'bg-purple-500', remaining: 'text-purple-600' },
  { badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500', remaining: 'text-orange-600' },
];

export default function StudentHomeworkPage() {
  const { studentCode } = useParams<{ studentCode: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{id: string; session_date: string; topic: string; subject: string; duration_hours: number; status: string; course_id: string | null}>>([]);
  const [courseMap, setCourseMap] = useState<Map<string, Course>>(new Map());
  const [makeups, setMakeups] = useState<Array<{id: string; topic: string; duration_hours: number}>>([]);
  const [attendedHours, setAttendedHours] = useState(0);
  const [radarAxes, setRadarAxes] = useState<RadarAxis[]>([]);
  const [radarSessions, setRadarSessions] = useState(0);
  const [sessionReports, setSessionReports] = useState<SessionReportInfo[]>([]);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [asgSessionMap, setAsgSessionMap] = useState<Map<string, string>>(new Map()); // session_id → topic
  const [asgCourseMap, setAsgCourseMap] = useState<Map<string, string>>(new Map());   // course_id → name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadData();
    return () => { channelRef.current?.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCode]);

  async function loadData() {
    const { data: stu } = await db()
      .from('students').select('*')
      .eq('student_code', studentCode.toUpperCase()).eq('is_active', true).single();
    if (!stu) { router.replace('/homework'); return; }
    setStudent(stu);
    await Promise.all([fetchAssignments(stu), fetchSessionData(stu), fetchRadar(stu.id)]);
    setLoading(false);
    if (!channelRef.current) {
      channelRef.current = db()
        .channel(`student-hw-${stu.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `student_id=eq.${stu.id}` }, () => fetchAssignments(stu))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions', filter: `student_id=eq.${stu.id}` }, () => fetchAssignments(stu))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'in_class_assessments', filter: `student_id=eq.${stu.id}` }, () => fetchRadar(stu.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'session_student_feedback', filter: `student_id=eq.${stu.id}` }, () => fetchSessionData(stu))
        .subscribe();
    }
  }

  async function fetchAssignments(stu: Student) {
    const { data: asgList } = await db().from('assignments').select('*').eq('is_active', true).order('created_at', { ascending: false });
    const filtered = (asgList ?? []).filter((a: Assignment) => {
      const noTarget = a.target_groups.length === 0 && (a.target_student_ids ?? []).length === 0;
      return noTarget || a.target_groups.includes(stu.group_key) || (a.target_student_ids ?? []).includes(stu.id);
    });
    const { data: subsData } = await db().from('homework_submissions').select('*').eq('student_id', stu.id);
    const { data: fbData } = await db().from('feedback').select('*').eq('student_id', stu.id);
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

    // Load session/course labels for assignments that have session_id
    const sIds = [...new Set(merged.map(a => a.session_id).filter(Boolean))] as string[];
    const cIds = [...new Set(merged.map(a => a.course_id).filter(Boolean))] as string[];
    const [sRes, cRes] = await Promise.all([
      sIds.length ? db().from('class_sessions').select('id, topic').in('id', sIds) : { data: [] },
      cIds.length ? db().from('courses').select('id, name').in('id', cIds) : { data: [] },
    ]);
    const sm = new Map<string, string>();
    (sRes.data ?? []).forEach((s: { id: string; topic: string }) => sm.set(s.id, s.topic));
    setAsgSessionMap(sm);
    const cm = new Map<string, string>();
    (cRes.data ?? []).forEach((c: { id: string; name: string }) => cm.set(c.id, c.name));
    setAsgCourseMap(cm);
  }

  async function fetchRadar(studentId: string) {
    const { data: assessments } = await db().from('in_class_assessments').select('skill_ratings').eq('student_id', studentId);
    if (!assessments?.length) { setRadarAxes([]); setRadarSessions(0); return; }
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const a of assessments) {
      for (const [skill, val] of Object.entries((a.skill_ratings ?? {}) as Record<string, number>)) {
        if (!val) continue;
        if (!totals[skill]) totals[skill] = { sum: 0, count: 0 };
        totals[skill].sum += val; totals[skill].count += 1;
      }
    }
    setRadarAxes(Object.entries(totals).filter(([, t]) => t.count > 0)
      .map(([label, t]) => ({ label, value: Math.round((t.sum / t.count / 5) * 100) })));
    setRadarSessions(assessments.length);
  }

  async function fetchSessionData(stu: Student) {
    const { data: attData } = await db().from('attendance').select('status, session_id').eq('student_id', stu.id);
    if (!attData?.length) { setSessions([]); setAttendedHours(0); setMakeups([]); setSessionReports([]); setCourseMap(new Map()); return; }

    const sessionIds = (attData as {status: string; session_id: string}[]).map(a => a.session_id);
    const { data: sessionData } = await db()
      .from('class_sessions').select('id, session_date, topic, subject, duration_hours, course_id')
      .in('id', sessionIds).order('session_date', { ascending: false });

    const sMap = new Map((sessionData ?? []).map((s: {id: string; session_date: string; topic: string; subject: string; duration_hours: number; course_id: string | null}) => [s.id, s]));
    const merged = (attData as {status: string; session_id: string}[])
      .map(a => { const s = sMap.get(a.session_id); return s ? { ...s, subject: s.subject ?? '', course_id: s.course_id ?? null, status: a.status } : null; })
      .filter(Boolean) as {id: string; session_date: string; topic: string; subject: string; duration_hours: number; status: string; course_id: string | null}[];
    merged.sort((a, b) => b.session_date.localeCompare(a.session_date));
    setSessions(merged);

    const hours = merged.filter(s => s.status === 'present').reduce((sum, s) => sum + s.duration_hours, 0);
    setAttendedHours(hours);

    // Fetch courses
    const courseIds = [...new Set(merged.filter(s => s.course_id).map(s => s.course_id as string))];
    if (courseIds.length > 0) {
      const { data: cData } = await db().from('courses').select('*').in('id', courseIds);
      const cMap = new Map<string, Course>();
      (cData ?? []).forEach((c: Course) => cMap.set(c.id, c));
      setCourseMap(cMap);
    } else {
      setCourseMap(new Map());
    }

    const [{ data: mkData }, { data: reportsData }, { data: fbData }] = await Promise.all([
      db().from('makeup_classes').select('id, topic, duration_hours').eq('student_id', stu.id).eq('completed', false),
      db().from('session_reports').select('session_id, video_url, video_urls, summary, attachments').in('session_id', sessionIds),
      db().from('session_student_feedback').select('session_id, feedback').eq('student_id', stu.id),
    ]);
    setMakeups((mkData ?? []) as {id: string; topic: string; duration_hours: number}[]);

    const rMap = new Map<string, {video_urls: string[]; video_url: string|null; summary: string|null; attachments: {url: string; name: string}[]}>();
    (reportsData ?? []).forEach((r: {session_id: string; video_urls?: string[]; video_url?: string|null; summary: string|null; attachments?: unknown}) => {
      const urls = (r.video_urls ?? []).length > 0 ? r.video_urls! : r.video_url ? [r.video_url] : [];
      const atts = Array.isArray(r.attachments) ? r.attachments as {url: string; name: string}[] : [];
      rMap.set(r.session_id, { video_urls: urls, video_url: r.video_url ?? null, summary: r.summary, attachments: atts });
    });
    const fMap = new Map<string, string|null>();
    (fbData ?? []).forEach((f: {session_id: string; feedback: string|null}) => fMap.set(f.session_id, f.feedback));

    const reports: SessionReportInfo[] = merged
      .map(s => ({ ...s, subject: s.subject ?? '', video_urls: rMap.get(s.id)?.video_urls ?? [], summary: rMap.get(s.id)?.summary ?? null, feedback: fMap.get(s.id) ?? null, attachments: rMap.get(s.id)?.attachments ?? [] }))
      .filter(r => r.video_urls.length > 0 || r.summary || r.feedback || r.attachments.length > 0);
    setSessionReports(reports);
    if (reports.length > 0) setExpandedReports(new Set([reports[0].id]));
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

  // Build course groups
  const courseGroups: Array<{
    key: string;
    course: Course | null;
    label: string;
    subject: string;
    sessions: typeof sessions;
    attendedHours: number;
    palette: typeof SUBJECT_PALETTE[0];
    quota: number;
  }> = [];
  const seenCourseIds = new Set<string>();
  for (const s of sessions) {
    if (s.course_id && !seenCourseIds.has(s.course_id)) {
      seenCourseIds.add(s.course_id);
      const courseSessions = sessions.filter(x => x.course_id === s.course_id);
      const c = courseMap.get(s.course_id);
      courseGroups.push({
        key: `course_${s.course_id}`,
        course: c ?? null,
        label: c?.name ?? 'คอร์ส',
        subject: c?.subject ?? s.subject ?? '',
        sessions: courseSessions,
        attendedHours: courseSessions.filter(x => x.status === 'present').reduce((sum, x) => sum + x.duration_hours, 0),
        palette: SUBJECT_PALETTE[courseGroups.length % SUBJECT_PALETTE.length],
        quota: c?.total_hours ?? 0,
      });
    }
  }
  // Legacy sessions (no course_id) — group by subject
  const legacySessions = sessions.filter(s => !s.course_id);
  const legacyBySubject = new Map<string, typeof sessions>();
  for (const s of legacySessions) {
    const key = s.subject || '__none';
    if (!legacyBySubject.has(key)) legacyBySubject.set(key, []);
    legacyBySubject.get(key)!.push(s);
  }
  for (const [key, slist] of legacyBySubject.entries()) {
    const subject = key === '__none' ? '' : key;
    courseGroups.push({
      key: `subject_${key}`,
      course: null,
      label: subject || 'อื่นๆ',
      subject,
      sessions: slist,
      attendedHours: slist.filter(x => x.status === 'present').reduce((sum, x) => sum + x.duration_hours, 0),
      palette: SUBJECT_PALETTE[courseGroups.length % SUBJECT_PALETTE.length],
      quota: student?.subject_quotas?.[subject] ?? 0,
    });
  }

  // Session report lookup
  const sessionReportBySid = new Map<string, SessionReportInfo>();
  sessionReports.forEach(sr => sessionReportBySid.set(sr.id, sr));

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
            <button onClick={() => { setRefreshing(true); if (student) fetchAssignments(student); }}
              disabled={refreshing}
              className="mt-1 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {refreshing ? '...' : '🔄 รีเฟรช'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-6">

        {/* Course + Session history */}
        {(sessions.length > 0 || makeups.length > 0) && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700">📅 คอร์สและชั่วโมงเรียน</h2>

            {courseGroups.map((group, gi) => {
              const groupReports = group.sessions
                .map(s => sessionReportBySid.get(s.id))
                .filter((r): r is SessionReportInfo => !!r);
              const pct = group.quota > 0 ? Math.min(100, (group.attendedHours / group.quota) * 100) : 0;

              return (
                <div key={group.key} className={gi > 0 ? 'border-t border-gray-100 pt-4 space-y-2' : 'space-y-2'}>
                  {/* Cover */}
                  {group.course?.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={group.course.cover_image_url} alt="" className="w-full h-28 object-cover rounded-xl" />
                  )}

                  {/* Course title row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {group.subject && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${group.palette.badge}`}>{group.subject}</span>
                    )}
                    {group.course && (
                      <span className="text-sm font-bold text-gray-800">{group.course.name}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{group.attendedHours} ชม.</span>
                  </div>

                  {/* Description */}
                  {group.course?.description && (
                    <p className="text-xs text-gray-500">{group.course.description}</p>
                  )}

                  {/* Progress bar */}
                  {group.quota > 0 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">เรียนแล้ว <span className="font-semibold text-gray-800">{group.attendedHours} ชม.</span></span>
                        <span className={`font-semibold ${group.palette.remaining}`}>เหลือ {Math.max(0, group.quota - group.attendedHours)} ชม.</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${group.palette.bar} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400">{group.attendedHours}/{group.quota} ชม.</p>
                    </div>
                  ) : null}

                  {/* Session list */}
                  {group.sessions.length > 0 && (
                    <div className="space-y-0.5">
                      {group.sessions.slice(0, 5).map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0">
                          <span>{s.status === 'present' ? '✅' : s.status === 'absent' ? '❌' : '🤒'}</span>
                          <span className="text-gray-400 shrink-0 w-14">
                            {new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-gray-700 flex-1 truncate">{s.topic}</span>
                          <span className="text-gray-400 shrink-0">{s.duration_hours} ชม.</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Session reports (videos) for this course */}
                  {groupReports.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-semibold text-gray-500">📹 บันทึกการเรียน ({groupReports.length})</p>
                      {groupReports.map(sr => {
                        const exp = expandedReports.has(sr.id);
                        return (
                          <div key={sr.id} className="border border-gray-100 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedReports(prev => { const n = new Set(prev); n.has(sr.id) ? n.delete(sr.id) : n.add(sr.id); return n; })}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
                              <span className="text-sm">{sr.status === 'present' ? '✅' : sr.status === 'absent' ? '❌' : '🤒'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{sr.topic}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(sr.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                  {' · '}{sr.duration_hours} ชม.
                                </p>
                              </div>
                              {sr.video_urls.length > 0 && <span className="text-xs shrink-0">📹{sr.video_urls.length > 1 ? ` ${sr.video_urls.length}` : ''}</span>}
                              {sr.feedback && <span className="text-xs shrink-0">💬</span>}
                              <span className="text-gray-300 shrink-0 text-xs">{exp ? '▲' : '▼'}</span>
                            </button>
                            {exp && (
                              <div className="px-3 pb-3 space-y-3 border-t border-gray-50 pt-3">
                                {sr.video_urls.map((url, vi) => (
                                  <div key={vi}>
                                    {sr.video_urls.length > 1 && <p className="text-xs font-semibold text-gray-500 mb-1">วิดีโอที่ {vi + 1}</p>}
                                    <VideoPlayer url={url} />
                                  </div>
                                ))}
                                {sr.summary && (
                                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">📝 สรุปเนื้อหา</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{sr.summary}</p>
                                  </div>
                                )}
                                {sr.attachments.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-gray-500">📎 ไฟล์ประกอบ ({sr.attachments.length})</p>
                                    {sr.attachments.map((att, ai) => (
                                      <a key={ai} href={att.url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors">
                                        <span className="text-base">{attIcon(att.name)}</span>
                                        <span className="flex-1 text-sm text-gray-700 truncate">{att.name}</span>
                                        <span className="text-xs text-blue-500 shrink-0">เปิด →</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {sr.feedback && (
                                  <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                                    <p className="text-xs font-semibold text-green-600 mb-1">💬 Feedback จากครู</p>
                                    <p className="text-sm text-green-800 whitespace-pre-wrap">{sr.feedback}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {makeups.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-orange-600 mb-1.5">🔁 Make-up คงค้าง ({makeups.length})</p>
                {makeups.map(m => (
                  <div key={m.id} className="text-xs bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5 text-orange-700 mb-1">
                    {m.topic} · {m.duration_hours} ชม.
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Radar chart */}
        {radarAxes.length >= 3 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">🕸️ ทักษะของฉัน</h2>
            <RadarChart axes={radarAxes} sessions={radarSessions} emptyLabel="ยังไม่มีข้อมูลทักษะ" />
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
                      {a.session_id && (
                        <p className="text-xs text-indigo-600 font-medium mb-1">
                          📅 {a.course_id && asgCourseMap.get(a.course_id) ? `${asgCourseMap.get(a.course_id)} · ` : ''}{asgSessionMap.get(a.session_id) ?? ''}
                        </p>
                      )}
                      <p className="font-semibold text-gray-800">{a.title}</p>
                      {a.description && <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{linkify(a.description)}</p>}
                      {a.due_date && (
                        <p className="text-xs text-red-500 mt-1">
                          ครบกำหนด: {new Date(a.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
                        </p>
                      )}
                    </div>
                    <button onClick={() => router.push(`/homework/${studentCode}/submit/${a.id}`)}
                      className="shrink-0 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
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
                      {a.session_id && (
                        <p className="text-xs text-indigo-500 mb-0.5">
                          📅 {a.course_id && asgCourseMap.get(a.course_id) ? `${asgCourseMap.get(a.course_id)} · ` : ''}{asgSessionMap.get(a.session_id) ?? ''}
                        </p>
                      )}
                      <p className="font-medium text-gray-800">{a.title}</p>
                      <p className="text-xs text-gray-400">
                        ส่งแล้ว {new Date(a.submission!.submitted_at).toLocaleDateString('th-TH')}
                        {a.due_date && ` · ครบกำหนด ${new Date(a.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </div>
                    {canEdit && (
                      <button onClick={() => withdrawSubmission(a.id, a.submission!.id)} disabled={withdrawing === a.id}
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
                    {a.session_id && (
                      <p className="text-xs text-indigo-500 mb-1">
                        📅 {a.course_id && asgCourseMap.get(a.course_id) ? `${asgCourseMap.get(a.course_id)} · ` : ''}{asgSessionMap.get(a.session_id) ?? ''}
                      </p>
                    )}
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-gray-800">{a.title}</p>
                      {pct != null && (
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                          {fb.score}/{fb.max_score} ({pct}%)
                        </span>
                      )}
                    </div>
                    {fb.comment && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">💬 {fb.comment}</p>
                    )}
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

        {assignments.length === 0 && sessions.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p>ยังไม่มีข้อมูลครับ</p>
          </div>
        )}
      </div>
    </main>
  );
}
