'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { VideoPlayer } from '@/components/VideoPlayer';
import { loadGoogleScript, requestAccessToken, uploadSessionVideo } from '@/lib/googleDrive';
import type { ClassSession, Student, Attendance } from '@/lib/db';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

interface FeedbackState {
  id?: string;
  text: string;
  saved: boolean;
  saving: boolean;
}

interface StudentWithAtt extends Student {
  status?: 'present' | 'absent' | 'leave';
}

export default function SessionReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [session, setSession] = useState<ClassSession | null>(null);
  const [students, setStudents] = useState<StudentWithAtt[]>([]);
  const [loading, setLoading] = useState(true);

  const [videoInput, setVideoInput] = useState('');
  const [videoPreview, setVideoPreview] = useState('');
  const [summary, setSummary] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<{ value: string; expiry: number } | null>(null);

  const [feedbacks, setFeedbacks] = useState<Map<string, FeedbackState>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('teacher_auth') !== '1') {
      router.replace('/teacher');
      return;
    }
    loadAll();
    loadGoogleScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function loadAll() {
    const { data: sess } = await db().from('class_sessions').select('*').eq('id', sessionId).single();
    if (!sess) { router.replace('/teacher/attendance'); return; }
    const s = sess as ClassSession;
    setSession(s);

    const { data: allStu } = await db().from('students').select('*').eq('is_active', true).order('nickname');
    const all = (allStu ?? []) as Student[];

    let sessionStudents: Student[];
    if (s.student_ids?.length > 0) {
      sessionStudents = all.filter(st => s.student_ids.includes(st.id));
    } else if (s.group_key) {
      sessionStudents = all.filter(st => st.group_key === s.group_key);
    } else {
      sessionStudents = all;
    }

    const { data: attData } = await db().from('attendance').select('*').eq('session_id', sessionId);
    const attMap = new Map<string, string>();
    (attData ?? []).forEach((a: Attendance) => attMap.set(a.student_id, a.status));

    setStudents(sessionStudents.map(st => ({
      ...st,
      status: (attMap.get(st.id) ?? undefined) as 'present' | 'absent' | 'leave' | undefined,
    })));

    const { data: report } = await db().from('session_reports').select('*').eq('session_id', sessionId).single();
    if (report) {
      setReportId(report.id);
      setVideoInput(report.video_url ?? '');
      setVideoPreview(report.video_url ?? '');
      setSummary(report.summary ?? '');
    }

    const { data: fbData } = await db().from('session_student_feedback').select('*').eq('session_id', sessionId);
    const fbMap = new Map<string, FeedbackState>();
    (fbData ?? []).forEach((f: { id: string; student_id: string; feedback: string }) => {
      fbMap.set(f.student_id, { id: f.id, text: f.feedback ?? '', saved: true, saving: false });
    });
    setFeedbacks(fbMap);
    setLoading(false);
  }

  async function getToken(): Promise<string> {
    if (tokenRef.current && tokenRef.current.expiry > Date.now()) {
      return tokenRef.current.value;
    }
    if (!GOOGLE_CLIENT_ID) throw new Error('ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GOOGLE_CLIENT_ID');
    await loadGoogleScript();
    const token = await requestAccessToken(GOOGLE_CLIENT_ID);
    tokenRef.current = { value: token, expiry: Date.now() + 55 * 60 * 1000 };
    return token;
  }

  async function uploadVideo(file: File) {
    try {
      const token = await getToken();
      const sessionDate = session?.session_date.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      const sessionTopic = session?.topic ?? 'Session';
      const url = await uploadSessionVideo(file, sessionTopic, sessionDate, token, setUploadProgress);
      setVideoInput(url);
      setVideoPreview(url);
      setUploadProgress(null);
      await doSaveReport(url, summary);
    } catch (err) {
      alert('อัปโหลดไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err)));
      setUploadProgress(null);
    }
  }

  async function doSaveReport(url: string, summaryText: string) {
    setSavingReport(true);
    const payload = {
      session_id: sessionId,
      video_url: url.trim() || null,
      summary: summaryText.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (reportId) {
      await db().from('session_reports').update(payload).eq('id', reportId);
    } else {
      const { data } = await db().from('session_reports').insert(payload).select().single();
      if (data) setReportId((data as { id: string }).id);
    }
    setSavingReport(false);
    setReportSaved(true);
    setTimeout(() => setReportSaved(false), 2000);
  }

  async function saveReport() {
    const url = videoInput.trim();
    setVideoPreview(url);
    await doSaveReport(url, summary);
  }

  async function saveFeedback(studentId: string) {
    const fb = feedbacks.get(studentId);
    if (!fb) return;

    setFeedbacks(prev => new Map(prev).set(studentId, { ...fb, saving: true }));

    const payload = { session_id: sessionId, student_id: studentId, feedback: fb.text.trim() || null };

    if (fb.id) {
      await db().from('session_student_feedback').update(payload).eq('id', fb.id);
      setFeedbacks(prev => new Map(prev).set(studentId, { ...(prev.get(studentId) ?? fb), saving: false, saved: true }));
    } else {
      const { data } = await db()
        .from('session_student_feedback')
        .upsert(payload, { onConflict: 'session_id,student_id' })
        .select().single();
      setFeedbacks(prev => new Map(prev).set(studentId, {
        ...(prev.get(studentId) ?? fb),
        id: data ? (data as { id: string }).id : undefined,
        saving: false,
        saved: true,
      }));
    }
  }

  function updateFeedback(studentId: string, text: string) {
    setFeedbacks(prev => {
      const existing = prev.get(studentId) ?? { text: '', saved: false, saving: false };
      return new Map(prev).set(studentId, { ...existing, text, saved: false });
    });
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>
  );

  const present = students.filter(s => s.status === 'present' || s.status === 'leave');
  const absent = students.filter(s => s.status === 'absent');
  const unmarked = students.filter(s => !s.status);
  const orderedStudents = [...present, ...absent, ...unmarked];

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/teacher/attendance" className="text-gray-400 hover:text-gray-600 text-lg leading-none">←</a>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 truncate">{session?.topic}</h1>
            <p className="text-xs text-gray-400">
              {session && new Date(session.session_date).toLocaleDateString('th-TH', {
                weekday: 'short', day: 'numeric', month: 'long', year: '2-digit',
              })}
              {' · '}{session?.duration_hours} ชม.
              {' · '}มา {present.length}/{students.length} คน
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-5">
        {/* Video */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">📹 วิดีโอการสอน</h2>

          {videoPreview && <VideoPlayer url={videoPreview} />}

          <input
            value={videoInput}
            onChange={e => setVideoInput(e.target.value)}
            placeholder="วาง URL วิดีโอ (YouTube, Google Drive, ฯลฯ)"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {uploadProgress !== null ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>⬆️ กำลังอัปโหลดไปยัง Google Drive...</span>
                <span className="font-semibold text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-gray-400 text-center">กรุณาอย่าปิดหน้าต่างขณะอัปโหลด</p>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border border-blue-300 text-blue-600 bg-blue-50 text-sm py-2.5 rounded-xl hover:bg-blue-100 transition-colors font-medium">
              ☁️ อัปโหลดไปยัง Google Drive
            </button>
          )}
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f); e.target.value = ''; }} />
        </div>

        {/* Class summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">📝 สรุปเนื้อหาคาบเรียน</h2>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="วันนี้เรียนเรื่อง... / จุดที่เน้น... / การบ้านที่มอบหมาย..."
            rows={4}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={saveReport}
            disabled={savingReport}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              reportSaved
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
            }`}>
            {savingReport ? 'กำลังบันทึก...' : reportSaved ? '✅ บันทึกแล้ว' : '💾 บันทึกวิดีโอ + สรุปคาบ'}
          </button>
        </div>

        {/* Individual feedback */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">💬 Feedback รายบุคคล</h2>
            <p className="text-xs text-gray-400 mt-0.5">นักเรียนและผู้ปกครองแต่ละคนเห็นเฉพาะ feedback ของตนเองครับ</p>
          </div>

          {orderedStudents.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ไม่พบนักเรียนใน session นี้</p>
          )}

          <div className="space-y-3">
            {orderedStudents.map(stu => {
              const fb = feedbacks.get(stu.id) ?? { text: '', saved: false, saving: false };
              const statusIcon = stu.status === 'present' ? '✅' : stu.status === 'absent' ? '❌' : stu.status === 'leave' ? '🤒' : '—';
              const hasSaved = fb.saved && fb.text.trim();

              return (
                <div key={stu.id}
                  className={`rounded-xl border p-3 space-y-2 transition-colors ${hasSaved ? 'border-green-200 bg-green-50/40' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{statusIcon}</span>
                    <span className="font-medium text-gray-800 text-sm">{stu.nickname}</span>
                    {stu.full_name && <span className="text-xs text-gray-400 truncate">({stu.full_name})</span>}
                    <span className="text-xs text-gray-400 ml-auto shrink-0">{stu.grade}</span>
                    {hasSaved && <span className="text-xs text-green-600 shrink-0">✅</span>}
                  </div>
                  <textarea
                    value={fb.text}
                    onChange={e => updateFeedback(stu.id, e.target.value)}
                    onBlur={() => { if (fb.text.trim()) saveFeedback(stu.id); }}
                    placeholder={`Feedback สำหรับน้อง${stu.nickname}...`}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveFeedback(stu.id)}
                      disabled={fb.saving || !fb.text.trim()}
                      className="text-xs px-3 py-1.5 bg-[#1D9E75] disabled:opacity-40 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                      {fb.saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
