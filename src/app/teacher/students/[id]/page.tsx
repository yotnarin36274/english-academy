'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, Assignment, HomeworkSubmission, FeedbackRow } from '@/lib/db';

interface ProgressItem {
  assignment: Assignment;
  submission: HomeworkSubmission | null;
  feedback: FeedbackRow | null;
}

function ProgressChart({ items }: { items: ProgressItem[] }) {
  const scored = items.filter(i => i.feedback?.score != null).reverse().slice(-10);
  if (scored.length < 2) return (
    <div className="text-center py-8 text-gray-400 text-sm">ต้องมีงานที่ให้คะแนนอย่างน้อย 2 ชิ้น</div>
  );
  const W = 300, H = 100, pad = 12;
  const pts = scored.map((item, idx) => {
    const x = pad + (idx / (scored.length - 1)) * (W - pad * 2);
    const pct = item.feedback!.score! / item.feedback!.max_score;
    const y = H - pad - pct * (H - pad * 2);
    return { x, y, pct: Math.round(pct * 100), title: item.assignment.title };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
        <line x1={pad} y1={H - pad - 0.8 * (H - pad * 2)} x2={W - pad} y2={H - pad - 0.8 * (H - pad * 2)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
        <line x1={pad} y1={H - pad - 0.6 * (H - pad * 2)} x2={W - pad} y2={H - pad - 0.6 * (H - pad * 2)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
        <polyline points={polyline} fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#1D9E75" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#6b7280">{p.pct}%</text>
          </g>
        ))}
      </svg>
      <div className="text-xs text-gray-400 text-center mt-1">ผลงาน {scored.length} ชิ้นล่าสุด</div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [lineToken, setLineToken] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: stu } = await db().from('students').select('*').eq('id', id).single();
      if (!stu) { router.replace('/teacher/students'); return; }
      setStudent(stu);
      setLineToken(stu.parent_line_notify_token ?? '');
      setNotes(stu.notes ?? '');

      const { data: asgList } = await db().from('assignments').select('*').eq('is_active', true).order('created_at', { ascending: false });
      const filtered = (asgList ?? []).filter(
        (a: Assignment) => a.target_groups.length === 0 || a.target_groups.includes(stu.group_key)
      );
      const { data: subs } = await db().from('homework_submissions').select('*, feedback(*)').eq('student_id', id);
      const subMap = new Map<string, HomeworkSubmission & { feedback: FeedbackRow[] }>();
      (subs ?? []).forEach((s: HomeworkSubmission & { feedback: FeedbackRow[] }) => subMap.set(s.assignment_id, s));
      const merged: ProgressItem[] = filtered.map((a: Assignment) => {
        const sub = subMap.get(a.id) ?? null;
        return { assignment: a, submission: sub, feedback: sub?.feedback?.[0] ?? null };
      });
      setItems(merged);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveEdits() {
    if (!student) return;
    setSaving(true);
    await db().from('students').update({
      parent_line_notify_token: lineToken.trim() || null,
      notes: notes.trim() || null,
    }).eq('id', student.id);
    setSaving(false);
    setEditing(false);
    setStudent(prev => prev ? { ...prev, parent_line_notify_token: lineToken.trim() || null, notes: notes.trim() || null } : null);
  }

  function copyParentLink() {
    if (!student) return;
    const url = `${window.location.origin}/parent/${student.parent_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const reviewed = items.filter(i => i.feedback?.score != null);
  const avgPct = reviewed.length
    ? Math.round(reviewed.reduce((s, i) => s + (i.feedback!.score! / i.feedback!.max_score) * 100, 0) / reviewed.length)
    : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
          <h1 className="text-lg font-bold text-gray-800">โปรไฟล์นักเรียน</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center">
              {student?.nickname[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">{student?.nickname}</h2>
              {student?.full_name && <p className="text-sm text-gray-500">{student.full_name}</p>}
              <p className="text-sm text-gray-500">{student?.grade} · <span className="font-mono">{student?.student_code}</span></p>
            </div>
            <button onClick={() => setEditing(!editing)} className="text-sm text-blue-600 hover:underline">แก้ไข</button>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="mt-4 space-y-3 pt-4 border-t">
              <div>
                <label className="text-xs font-medium text-gray-600">LINE Notify Token ผู้ปกครอง</label>
                <input value={lineToken} onChange={e => setLineToken(e.target.value)}
                  placeholder="Token จาก notify.line.me"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">โน้ตครู</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button onClick={saveEdits} disabled={saving} className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">{saving ? '...' : 'บันทึก'}</button>
              </div>
            </div>
          )}

          {/* Parent portal link */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">ลิงก์ผู้ปกครอง</p>
                <p className="text-xs text-gray-400">ส่งให้ผู้ปกครองบุ๊คมาร์คไว้</p>
              </div>
              <button onClick={copyParentLink}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอกลิงก์'}
              </button>
            </div>
            {student?.parent_line_notify_token
              ? <p className="text-xs text-green-600 mt-2">✅ เชื่อมต่อ LINE แจ้งเตือนแล้ว</p>
              : <p className="text-xs text-amber-500 mt-2">⚠️ ยังไม่ได้ตั้ง LINE Token — แจ้งเตือนอัตโนมัติจะยังไม่ทำงาน</p>
            }
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{items.length}</p>
            <p className="text-xs text-gray-500">งานทั้งหมด</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{items.filter(i => i.submission).length}</p>
            <p className="text-xs text-gray-500">ส่งแล้ว</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold ${avgPct == null ? 'text-gray-400' : avgPct >= 80 ? 'text-green-600' : avgPct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
              {avgPct != null ? `${avgPct}%` : '—'}
            </p>
            <p className="text-xs text-gray-500">เฉลี่ย</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">📈 กราฟพัฒนาการ</h3>
          <ProgressChart items={items} />
        </div>

        {/* Submission history */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">ประวัติการบ้าน</h3>
          <div className="space-y-2">
            {items.map(({ assignment: a, submission: sub, feedback: fb }) => (
              <div key={a.id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-800 flex-1">{a.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${!sub ? 'bg-red-50 text-red-500' : !fb ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-700'}`}>
                    {!sub ? 'ไม่ส่ง' : !fb ? 'รอตรวจ' : fb.score != null ? `${fb.score}/${fb.max_score}` : 'ตรวจแล้ว'}
                  </span>
                </div>
                {fb?.comment && <p className="text-xs text-gray-500 mt-1 truncate">💬 {fb.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
