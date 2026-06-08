'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, Assignment, HomeworkSubmission, FeedbackRow } from '@/lib/db';

interface ProgressItem {
  assignment: Assignment;
  submission: HomeworkSubmission | null;
  feedback: FeedbackRow | null;
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

function MiniChart({ items }: { items: ProgressItem[] }) {
  const reviewed = items.filter(i => i.feedback?.score != null).slice(-8);
  if (reviewed.length < 2) return null;
  const maxScore = Math.max(...reviewed.map(i => i.feedback!.max_score));
  const W = 280, H = 80, pad = 10;
  const pts = reviewed.map((item, idx) => {
    const x = pad + (idx / (reviewed.length - 1)) * (W - pad * 2);
    const y = H - pad - ((item.feedback!.score! / item.feedback!.max_score) * (H - pad * 2));
    return { x, y, item };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
      <polyline points={polyline} fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#1D9E75" />
      ))}
    </svg>
  );
}

export default function ParentPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
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
      .eq('parent_token', token)
      .single();

    if (!stu) { setLoading(false); return; }
    setStudent(stu);
    await fetchItems(stu);
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

    const { data: subs } = await db()
      .from('homework_submissions')
      .select('*, feedback(*)')
      .eq('student_id', stu.id);

    const subMap = new Map<string, HomeworkSubmission & { feedback: FeedbackRow[] }>();
    (subs ?? []).forEach((s: HomeworkSubmission & { feedback: FeedbackRow[] }) => subMap.set(s.assignment_id, s));

    const merged: ProgressItem[] = filtered.map((a: Assignment) => {
      const sub = subMap.get(a.id) ?? null;
      return { assignment: a, submission: sub, feedback: sub?.feedback?.[0] ?? null };
    });
    setItems(merged);
    setLastUpdated(new Date());
  }

  function subscribeRealtime(stu: Student) {
    channelRef.current = db()
      .channel(`parent-${stu.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions', filter: `student_id=eq.${stu.id}` },
        () => fetchItems(stu))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `student_id=eq.${stu.id}` },
        () => fetchItems(stu))
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
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-5">
        {/* Progress chart */}
        {reviewed.length >= 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">📈 กราฟพัฒนาการ (8 ชิ้นงานล่าสุด)</h2>
            <MiniChart items={items} />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>เก่าสุด</span>
              <span>ล่าสุด</span>
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
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mt-2">
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
