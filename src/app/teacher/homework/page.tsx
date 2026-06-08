'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import { sendLineNotify, buildFeedbackMessage } from '@/lib/notifications';
import type { HomeworkSubmission, Student, Assignment, FeedbackRow } from '@/lib/db';

interface SubWithJoins extends HomeworkSubmission {
  students: Student;
  assignments: Assignment;
  feedback: FeedbackRow[];
}

function guessType(url: string): 'image' | 'video' | 'audio' | 'pdf' | 'word' | 'other' {
  const u = url.toLowerCase().split('?')[0];
  if (/\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/.test(u)) return 'image';
  if (/\.(mp4|mov|webm|avi|mkv|m4v)$/.test(u)) return 'video';
  if (/\.(mp3|m4a|wav|aac|ogg|flac)$/.test(u)) return 'audio';
  if (/\.pdf$/.test(u)) return 'pdf';
  if (/\.(doc|docx)$/.test(u)) return 'word';
  return 'other';
}
const TYPE_ICON: Record<string, string> = { image:'🖼️', video:'🎥', audio:'🎵', pdf:'📄', word:'📝', other:'📁' };

function FilePreview({ url }: { url: string }) {
  const type = guessType(url);
  const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'ไฟล์');
  if (type === 'image') return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border" />
  );
  if (type === 'video') return (
    <video src={url} className="w-20 h-20 object-cover rounded-xl border bg-black" muted />
  );
  if (type === 'audio') return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-3xl">🎵</span>
      <audio src={url} controls className="w-32 h-8" />
    </div>
  );
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex flex-col items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors">
      <span className="text-2xl">{TYPE_ICON[type]}</span>
      <span className="text-xs text-gray-600 max-w-[80px] text-center truncate">{filename}</span>
      <span className="text-xs text-blue-500">เปิดดู</span>
    </a>
  );
}

function FileModal({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const url = urls[idx];
  const type = guessType(url);
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        {type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full rounded-2xl max-h-[80vh] object-contain bg-black" />
        ) : type === 'video' ? (
          <video src={url} controls autoPlay className="w-full rounded-2xl max-h-[80vh] bg-black" />
        ) : type === 'audio' ? (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
            <span className="text-5xl">🎵</span>
            <audio src={url} controls autoPlay className="w-full" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center">
            <span className="text-5xl">{TYPE_ICON[type]}</span>
            <p className="mt-3 text-gray-700 text-sm break-all">{decodeURIComponent(url.split('/').pop() ?? '')}</p>
            <a href={url} target="_blank" rel="noreferrer"
              className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              เปิดไฟล์ →
            </a>
          </div>
        )}
        {urls.length > 1 && (
          <div className="flex justify-center gap-3 mt-3">
            {urls.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-3 h-3 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
        <button onClick={onClose} className="absolute -top-4 -right-4 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow">×</button>
      </div>
    </div>
  );
}

function GradePanel({ sub, onDone }: { sub: SubWithJoins; onDone: () => void }) {
  const existing = sub.feedback?.[0];
  const [score, setScore] = useState(existing?.score?.toString() ?? '');
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function save() {
    setSaving(true);
    setSaveError('');
    const scoreNum = score !== '' ? parseInt(score) : null;
    const fbData = {
      submission_id: sub.id,
      student_id: sub.student_id,
      assignment_id: sub.assignment_id,
      score: scoreNum,
      max_score: sub.assignments.max_score,
      comment: comment.trim() || null,
      reviewed_at: new Date().toISOString(),
    };

    const { error: fbErr } = await db().from('feedback').upsert(fbData, { onConflict: 'submission_id' });
    if (fbErr) { setSaveError(`บันทึกไม่สำเร็จ: ${fbErr.message}`); setSaving(false); return; }
    await db().from('homework_submissions').update({ status: 'reviewed' }).eq('id', sub.id);

    // LINE Notify
    const token = sub.students.parent_line_notify_token;
    if (token) {
      const baseUrl = window.location.origin;
      const mockFb: FeedbackRow = { ...fbData, id: '', created_at: '' };
      const msg = buildFeedbackMessage(sub.students, sub.assignments, mockFb, baseUrl);
      const ok = await sendLineNotify(token, msg);
      if (ok) setNotifySent(true);
    }

    setSaving(false);
    onDone();
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 mt-3 space-y-3">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600">คะแนน (จาก {sub.assignments.max_score})</label>
          <input type="number" min="0" max={sub.assignments.max_score} value={score}
            onChange={e => setScore(e.target.value)}
            placeholder="เว้นว่างถ้าไม่ให้คะแนน"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button onClick={save} disabled={saving}
          className="bg-[#1D9E75] hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          {saving ? '...' : existing ? '💾 อัพเดท' : '💾 บันทึก'}
        </button>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">ความเห็น / Feedback</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="พิมพ์ feedback ให้นักเรียน..."
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      {saveError && <p className="text-xs text-red-500 font-medium">❌ {saveError}</p>}
      {notifySent && (
        <p className="text-xs text-green-600 font-medium">✅ ส่ง LINE แจ้งผู้ปกครองแล้ว</p>
      )}
      {sub.students.parent_line_notify_token && !notifySent && (
        <p className="text-xs text-gray-400">จะส่ง LINE แจ้งผู้ปกครองอัตโนมัติเมื่อกดบันทึก</p>
      )}
    </div>
  );
}

export default function TeacherHomeworkPage() {
  const [submissions, setSubmissions] = useState<SubWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [lightbox, setLightbox] = useState<string[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    load();
    const ch = db().channel('teacher-hw')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions' }, load)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, []);

  async function load() {
    const { data } = await db()
      .from('homework_submissions')
      .select('*, students(*), assignments(*), feedback(*)')
      .order('submitted_at', { ascending: false });
    setSubmissions((data ?? []) as SubWithJoins[]);
    setLoading(false);
  }

  const filtered = submissions.filter(s =>
    filter === 'all' ? true : filter === 'pending' ? s.status === 'pending' : s.status === 'reviewed'
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {lightbox && <FileModal urls={lightbox} onClose={() => setLightbox(null)} />}

      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-800">📋 ตรวจการบ้าน</h1>
            <div className="flex gap-2 text-xs">
              <a href="/teacher/assignments" className="text-blue-600 hover:underline">จัดการงาน</a>
              <span className="text-gray-300">|</span>
              <a href="/teacher/students" className="text-blue-600 hover:underline">นักเรียน</a>
            </div>
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'reviewed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f === 'all' ? `ทั้งหมด (${submissions.length})` : f === 'pending' ? `รอตรวจ (${submissions.filter(s => s.status === 'pending').length})` : `ตรวจแล้ว (${submissions.filter(s => s.status === 'reviewed').length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4 space-y-4">
        {filtered.map(sub => {
          const fb = sub.feedback?.[0];
          const isExpanded = expandedId === sub.id;
          return (
            <div key={sub.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Card header */}
              <button className="w-full text-left p-4" onClick={() => setExpandedId(isExpanded ? null : sub.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {sub.students.nickname[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{sub.students.nickname}
                        {sub.students.full_name && <span className="text-xs text-gray-400 ml-1">({sub.students.full_name})</span>}
                      </p>
                      <p className="text-sm text-gray-500">{sub.assignments.title}</p>
                      <p className="text-xs text-gray-400">{sub.students.grade} · {new Date(sub.submitted_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {fb?.score != null && (
                      <span className="text-sm font-bold text-gray-700">{fb.score}/{sub.assignments.max_score}</span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${sub.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-700'}`}>
                      {sub.status === 'pending' ? '⏳ รอตรวจ' : '✅ ตรวจแล้ว'}
                    </span>
                    <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
              </button>

              {/* Expanded */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-50">
                  {/* Images */}
                  {sub.image_urls?.length > 0 && (
                    <div className="flex gap-3 mt-3 flex-wrap items-end">
                      {sub.image_urls.map((url, i) => (
                        <button key={i} onClick={() => setLightbox(sub.image_urls)}
                          className="hover:opacity-80 transition-opacity">
                          <FilePreview url={url} />
                        </button>
                      ))}
                    </div>
                  )}

                  {sub.note && (
                    <p className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 mt-3">
                      📝 หมายเหตุนักเรียน: {sub.note}
                    </p>
                  )}

                  <GradePanel sub={sub} onDone={load} />
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p>{filter === 'pending' ? 'ไม่มีงานรอตรวจครับ' : 'ยังไม่มีงานครับ'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
