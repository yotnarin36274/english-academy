'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/supabase';
import { RadarChart } from '@/components/RadarChart';
import type { RadarAxis } from '@/components/RadarChart';
import type { Student, Assignment, HomeworkSubmission, FeedbackRow } from '@/lib/db';
import { VideoPlayer } from '@/components/VideoPlayer';

interface ProgressItem {
  assignment: Assignment;
  submission: HomeworkSubmission | null;
  feedback: FeedbackRow | null;
}

interface SessionReportInfo {
  id: string; session_date: string; topic: string; duration_hours: number; status: string;
  video_url: string | null; summary: string | null; feedback: string | null;
}

function guessType(url: string): 'image' | 'video' | 'audio' | 'pdf' | 'word' | 'other' {
  const u = url.toLowerCase().split('?')[0];
  if (/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/.test(u)) return 'image';
  if (/\.(mp4|mov|webm|avi|m4v)$/.test(u)) return 'video';
  if (/\.(mp3|m4a|wav|aac|ogg)$/.test(u)) return 'audio';
  if (/\.pdf$/.test(u)) return 'pdf';
  if (/\.(doc|docx)$/.test(u)) return 'word';
  return 'other';
}
const FILE_ICON: Record<string, string> = { image: '🖼️', video: '🎥', audio: '🎵', pdf: '📄', word: '📝', other: '📁' };
const FILE_LABEL: Record<string, string> = { image: 'รูปภาพ', video: 'วิดีโอ', audio: 'เสียง', pdf: 'PDF', word: 'Word', other: 'ไฟล์' };

function ParentFileItem({ url }: { url: string }) {
  const type = guessType(url);
  const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'ไฟล์');
  if (type === 'image') return (
    <a href={url} target="_blank" rel="noreferrer" className="block hover:opacity-80 transition-opacity">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-20 w-20 object-cover rounded-xl border-2 border-gray-200" />
    </a>
  );
  if (type === 'video') return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-black">
      <video src={url} controls className="h-32 max-w-full" />
    </div>
  );
  if (type === 'audio') return (
    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 w-full">
      <span className="text-xl shrink-0">🎵</span>
      <audio src={url} controls className="flex-1 h-8" />
    </div>
  );
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors text-sm">
      <span className="text-xl">{FILE_ICON[type]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-700 truncate">{name}</p>
        <p className="text-xs text-gray-400">{FILE_LABEL[type]}</p>
      </div>
      <span className="text-blue-500 text-xs shrink-0">เปิด →</span>
    </a>
  );
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? '#1D9E75' : pct >= 60 ? '#EF9F27' : '#ef4444';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}


export default function ParentPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [radarAxes, setRadarAxes] = useState<RadarAxis[]>([]);
  const [radarSessions, setRadarSessions] = useState(0);
  const [sessions, setSessions] = useState<Array<{id: string; session_date: string; topic: string; duration_hours: number; status: string}>>([]);
  const [makeups, setMakeups] = useState<Array<{id: string; topic: string; duration_hours: number}>>([]);
  const [attendedHours, setAttendedHours] = useState(0);
  const [sessionReports, setSessionReports] = useState<SessionReportInfo[]>([]);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadData();
    return () => { channelRef.current?.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadData() {
    const { data: stu } = await db()
      .from('students')
      .select('*')
      .eq('student_code', token.toUpperCase())
      .single();

    if (!stu) { setLoading(false); return; }
    setStudent(stu);
    await Promise.all([fetchItems(stu), fetchSessionData(stu), fetchRadar(stu.id)]);
    setLoading(false);
    subscribeRealtime(stu);
  }

  async function fetchItems(stu: Student) {
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

    const merged: ProgressItem[] = filtered.map((a: Assignment) => {
      const sub = subMap.get(a.id) ?? null;
      const fb = sub ? fbBySubId.get(sub.id) ?? null : null;
      return { assignment: a, submission: sub, feedback: fb };
    });
    setItems(merged);
    setLastUpdated(new Date());
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
    const { data: attData } = await db()
      .from('attendance').select('status, session_id').eq('student_id', stu.id);
    if (!attData?.length) { setSessions([]); setAttendedHours(0); setMakeups([]); setSessionReports([]); return; }

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

    const [{ data: mkData }, { data: reportsData }, { data: fbData }] = await Promise.all([
      db().from('makeup_classes').select('id, topic, duration_hours').eq('student_id', stu.id).eq('completed', false),
      db().from('session_reports').select('session_id, video_url, summary').in('session_id', sessionIds),
      db().from('session_student_feedback').select('session_id, feedback').eq('student_id', stu.id),
    ]);
    setMakeups((mkData ?? []) as {id: string; topic: string; duration_hours: number}[]);

    const rMap = new Map<string, {video_url: string|null; summary: string|null}>();
    (reportsData ?? []).forEach((r: {session_id: string; video_url: string|null; summary: string|null}) => rMap.set(r.session_id, r));
    const fMap = new Map<string, string|null>();
    (fbData ?? []).forEach((f: {session_id: string; feedback: string|null}) => fMap.set(f.session_id, f.feedback));

    const reports: SessionReportInfo[] = merged
      .map(s => ({ ...s, video_url: rMap.get(s.id)?.video_url ?? null, summary: rMap.get(s.id)?.summary ?? null, feedback: fMap.get(s.id) ?? null }))
      .filter(r => r.video_url || r.summary || r.feedback);
    setSessionReports(reports);
    if (reports.length > 0) setExpandedReports(new Set([reports[0].id]));
  }

  function subscribeRealtime(stu: Student) {
    channelRef.current = db()
      .channel(`parent-${stu.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions', filter: `student_id=eq.${stu.id}` },
        () => fetchItems(stu))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `student_id=eq.${stu.id}` },
        () => fetchItems(stu))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'in_class_assessments', filter: `student_id=eq.${stu.id}` },
        () => fetchRadar(stu.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_student_feedback', filter: `student_id=eq.${stu.id}` },
        () => fetchSessionData(stu))
      .subscribe();
  }

  const reviewed = items.filter(i => i.feedback?.score != null);

  const avgScore = reviewed.length
    ? Math.round(reviewed.reduce((s, i) => s + (i.feedback!.score! / i.feedback!.max_score) * 100, 0) / reviewed.length)
    : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  if (!student) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-gray-600">ไม่พบข้อมูล กรุณาติดต่อครูครับ</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1D9E75] to-green-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <p className="text-green-100 text-sm">ENG SPARK ⚡ — รายงานผู้ปกครอง</p>
          <h1 className="text-xl font-bold mt-1">น้อง{student.nickname}</h1>
          <p className="text-green-100 text-sm">{student.full_name ? `${student.full_name} · ` : ''}{student.grade}</p>

          {/* Summary pills */}
          <div className="flex gap-3 mt-4 flex-wrap">
            <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-center">
              <p className="text-xs text-green-100">งานทั้งหมด</p>
              <p className="text-xl font-bold">{items.length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-center">
              <p className="text-xs text-green-100">ส่งแล้ว</p>
              <p className="text-xl font-bold">{items.filter(i => i.submission).length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-center">
              <p className="text-xs text-green-100">ตรวจแล้ว</p>
              <p className="text-xl font-bold">{reviewed.length}</p>
            </div>
            {avgScore != null && (
              <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-green-100">เฉลี่ย</p>
                <p className="text-xl font-bold">{avgScore}%</p>
              </div>
            )}
            {student.session_type === 'fixed' && student.total_course_hours ? (
              <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-green-100">ชม.เหลือ</p>
                <p className="text-xl font-bold">{Math.max(0, student.total_course_hours - attendedHours)}</p>
              </div>
            ) : attendedHours > 0 ? (
              <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-green-100">ชม.เรียน</p>
                <p className="text-xl font-bold">{attendedHours}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-5">
        {/* Session history */}
        {(student.total_course_hours || sessions.length > 0 || makeups.length > 0) && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">📅 ชั่วโมงเรียน</h2>

            {student.session_type === 'fixed' && student.total_course_hours ? (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">เรียนแล้ว <span className="font-semibold text-gray-800">{attendedHours} ชม.</span></span>
                  <span className="font-semibold text-green-700">เหลือ {Math.max(0, student.total_course_hours - attendedHours)} ชม.</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full transition-all"
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
          </div>
        )}

        {/* Radar chart */}
        {radarAxes.length >= 3 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">🕸️ พัฒนาการทักษะ</h2>
            <RadarChart axes={radarAxes} sessions={radarSessions} emptyLabel="ยังไม่มีข้อมูลทักษะ" />
          </div>
        )}

        {/* Session reports */}
        {sessionReports.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">📹 บันทึกการเรียน</h2>
            <div className="space-y-2">
              {sessionReports.map(sr => {
                const expanded = expandedReports.has(sr.id);
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
                      {sr.video_url && <span className="text-xs shrink-0">📹</span>}
                      {sr.feedback && <span className="text-xs shrink-0">💬</span>}
                      <span className="text-gray-300 shrink-0 text-xs">{expanded ? '▲' : '▼'}</span>
                    </button>
                    {expanded && (
                      <div className="px-3 pb-3 space-y-3 border-t border-gray-50 pt-3">
                        {sr.video_url && <VideoPlayer url={sr.video_url} />}
                        {sr.summary && (
                          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                            <p className="text-xs font-semibold text-gray-500 mb-1">📝 สรุปเนื้อหา</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{sr.summary}</p>
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
          </div>
        )}

        {/* Assignment list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">รายการงาน</h2>
            <span className="text-xs text-gray-400">
              🔄 {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="space-y-3">
            {items.map(({ assignment: a, submission: sub, feedback: fb }) => {
              const status = !sub ? 'notSubmitted' : !fb ? 'pending' : 'reviewed';
              return (
                <div key={a.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-800 flex-1">{a.title}</p>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 font-medium ${
                      status === 'notSubmitted' ? 'bg-red-100 text-red-600' :
                      status === 'pending' ? 'bg-amber-100 text-amber-600' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {status === 'notSubmitted' ? '📌 ยังไม่ส่ง' : status === 'pending' ? '⏳ รอตรวจ' : '✅ ตรวจแล้ว'}
                    </span>
                  </div>

                  {sub && (
                    <>
                      <p className="text-xs text-gray-400 mt-1">
                        ส่งเมื่อ {new Date(sub.submitted_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {/* Submitted files */}
                      {sub.image_urls?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">📎 ไฟล์ที่ส่ง</p>
                          <div className="flex flex-wrap gap-2">
                            {(sub.image_urls as string[]).map((url, i) => (
                              <ParentFileItem key={i} url={url} />
                            ))}
                          </div>
                        </div>
                      )}

                      {sub.note && (
                        <p className="text-sm text-gray-500 bg-blue-50 rounded-xl p-3 mt-2 text-xs">
                          📝 หมายเหตุ: {sub.note}
                        </p>
                      )}
                    </>
                  )}

                  {fb && (
                    <div className="mt-3 space-y-2">
                      {fb.score != null && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">คะแนน</span>
                            <span className="font-bold text-gray-800">{fb.score}/{fb.max_score}</span>
                          </div>
                          <ScoreBar score={fb.score} max={fb.max_score} />
                        </>
                      )}
                      {fb.comment && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mt-2 whitespace-pre-wrap">
                          💬 {fb.comment}
                        </p>
                      )}
                    </div>
                  )}

                  {!sub && a.due_date && (
                    <p className="text-xs text-red-400 mt-1">
                      ครบกำหนด {new Date(a.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📚</div>
              <p>ยังไม่มีการบ้านครับ</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          อัพเดทแบบ Real-time · ไม่ต้องรีเฟรช<br />
          ENG SPARK ⚡ English Academy
        </p>
      </div>
    </main>
  );
}
